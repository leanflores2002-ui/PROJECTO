"""Private administrative activity, account invitations and GA4 reports."""
from datetime import date, timedelta, datetime, timezone
import os
import re
from threading import RLock
from time import monotonic
from uuid import UUID
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Literal
from psycopg.types.json import Jsonb

from .config import get_settings
from .database import database_connection
from .security import AdminPrincipal, require_admin, require_roles

router = APIRouter(prefix='/api/admin', tags=['admin'])
_cache = {}
_lock = RLock()


@router.get('/notifications')
def notifications(page: int = Query(1, ge=1), admin: AdminPrincipal = Depends(require_admin)):
    with database_connection() as connection:
        rows = connection.execute('''select a.id, a.action, a.entity_type, a.entity_id,
            a.details, a.created_at, p.display_name as actor
            from public.audit_logs a left join public.admin_profiles p on p.user_id=a.admin_user_id
            order by a.created_at desc, a.id desc limit 26 offset %s''', ((page-1)*25,)).fetchall()
    return {'items': rows[:25], 'hasMore': len(rows)>25, 'page': page}


class UserInvite(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    display_name: str = Field(min_length=2, max_length=100)
    role: Literal['admin', 'operator', 'viewer'] = 'operator'


@router.post('/users/invite', status_code=201)
def invite_user(payload: UserInvite, admin: AdminPrincipal = Depends(require_roles('superadmin'))):
    email = payload.email.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        raise HTTPException(422, 'Ingresá un correo válido')
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(503, 'Supabase Auth no está configurado')
    # Insert the allowlist inside a transaction. An invitation alone never grants access.
    with database_connection() as connection, connection.transaction():
        existing = connection.execute('select id from auth.users where lower(email)=%s', (email,)).fetchone()
        if existing:
            raise HTTPException(409, 'Ese correo ya tiene una cuenta. No se cambió su rol.')
        try:
            response = httpx.post(settings.supabase_url.rstrip('/')+'/auth/v1/invite',
                headers={'apikey': settings.supabase_service_role_key,
                         'Authorization': 'Bearer '+settings.supabase_service_role_key},
                json={'email': email, 'data': {'display_name': payload.display_name}},
                params={'redirect_to': (settings.admin_frontend_origin or settings.public_frontend_origin or '').rstrip('/')+'/admin/activate'}, timeout=20)
        except httpx.HTTPError:
            raise HTTPException(502, 'No se pudo enviar la invitación. Revisá Usuarios antes de reintentar.')
        if not response.is_success:
            raise HTTPException(502, 'Supabase no pudo enviar la invitación. No se otorgó acceso.')
        user_id = UUID(response.json()['id'])
        connection.execute('''insert into public.admin_profiles(user_id, display_name, role, is_active)
            values(%s,%s,%s,true)''', (user_id,payload.display_name.strip(),payload.role))
        connection.execute('''insert into public.audit_logs(admin_user_id,action,entity_type,entity_id,details)
            values(%s,'invite','admin',%s,%s)''',
            (admin.user_id,user_id,Jsonb({'display_name':payload.display_name,'role':payload.role})))
    return {'userId':str(user_id),'role':payload.role,'message':'Invitación enviada'}


def report_request(start, end, dimensions, metrics, **extra):
    return {'dateRanges':[{'startDate':start,'endDate':end}],
            'dimensions':[{'name':name} for name in dimensions],
            'metrics':[{'name':name} for name in metrics], **extra}


def rows(report, dimensions, metrics):
    output=[]
    for row in report.get('rows',[]):
        entry={name:value['value'] for name,value in zip(dimensions,row.get('dimensionValues',[]))}
        entry.update({name:float(value['value']) for name,value in zip(metrics,row.get('metricValues',[]))})
        output.append(entry)
    return output


def google_reports(property_id, requests):
    import google.auth
    from google.auth.transport.requests import Request
    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/analytics.readonly'])
    credentials.refresh(Request())
    response = httpx.post(f'https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:batchRunReports',
        headers={'Authorization':'Bearer '+credentials.token},json={'requests':requests},timeout=25)
    response.raise_for_status()
    return response.json()['reports']


@router.get('/analytics')
def analytics(start: date | None = None, end: date | None = None, item_id: str | None = Query(None, max_length=200),
              admin: AdminPrincipal = Depends(require_admin)):
    today = datetime.now(ZoneInfo('America/Argentina/Buenos_Aires')).date()
    end = end or today
    start = start or end-timedelta(days=29)
    if start>end or (end-start).days>366 or end>today:
        raise HTTPException(422, 'Elegí un período válido de hasta 367 días')
    prop = os.getenv('GA4_PROPERTY_ID','').strip()
    if not prop:
        return {'configured':False,'message':'Falta conectar la propiedad de Google Analytics.',
                'daily':[],'products':[],'summary':None}
    if not prop.isdigit():
        raise HTTPException(503, 'GA4_PROPERTY_ID debe ser el ID numérico de la propiedad')
    key=(prop,start,end,item_id)
    with _lock:
        cached=_cache.get(key)
        if cached and monotonic()-cached[0]<300:
            return cached[1]
    a,b=start.isoformat(),end.isoformat()
    requests=[
        report_request(a,b,['date'],['totalUsers','sessions','screenPageViews'],
                       orderBys=[{'dimension':{'dimensionName':'date'}}]),
        report_request(a,b,[],['totalUsers','sessions','screenPageViews']),
        report_request(a,b,['itemId','itemName'],['itemsViewed','itemsAddedToCart'],
                       orderBys=[{'metric':{'metricName':'itemsViewed'},'desc':True}],limit='100'),
        report_request(a,b,[],['eventCount'],dimensionFilter={'filter':{
            'fieldName':'eventName','stringFilter':{'matchType':'EXACT','value':'whatsapp_order_click'}}})]
    if item_id:
        requests[2]['dimensionFilter'] = {'filter': {'fieldName':'itemId', 'stringFilter': {'matchType':'EXACT', 'value':item_id}}}
    try:
        reports=google_reports(prop,requests)
    except Exception:
        raise HTTPException(502, 'No pudimos leer Google Analytics. Revisá las credenciales y el acceso a la propiedad.')
    summary=rows(reports[1],[],['totalUsers','sessions','screenPageViews'])
    consultations=rows(reports[3],[],['eventCount'])
    result={'configured':True,'start':a,'end':b,'updatedAt':datetime.now(timezone.utc).isoformat(),
            'daily':rows(reports[0],['date'],['totalUsers','sessions','screenPageViews']),
            'products':rows(reports[2],['itemId','itemName'],['itemsViewed','itemsAddedToCart']),
            'summary':summary[0] if summary else {'totalUsers':0,'sessions':0,'screenPageViews':0},
            'whatsappClicks':consultations[0]['eventCount'] if consultations else 0,
            'limited':any(r.get('metadata',{}).get('subjectToThresholding') or r.get('metadata',{}).get('dataLossFromOtherRow') for r in reports)}
    with _lock:
        if len(_cache)>30:
            _cache.clear()
        _cache[key]=(monotonic(),result)
    return result

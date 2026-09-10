"""Requires a migrated disposable ROMIX_TEST_DATABASE_URL (localhost/romix_qa only)."""
import os
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import psycopg
from psycopg.rows import dict_row
import pytest
from fastapi.testclient import TestClient
from backend.app import main, admin_api, public_api, admin_extra
from backend.app.security import AdminPrincipal, require_admin


@pytest.fixture
def shop(monkeypatch):
    url = os.getenv('ROMIX_TEST_DATABASE_URL')
    if not url:
        pytest.skip('ROMIX_TEST_DATABASE_URL required')
    params = psycopg.conninfo.conninfo_to_dict(url)
    assert params['host'] in ('127.0.0.1', 'localhost') and params['dbname'] == 'romix_qa'
    @contextmanager
    def connection():
        with psycopg.connect(url, row_factory=dict_row) as c:
            yield c
    for module in (main, admin_api, public_api, admin_extra):
        monkeypatch.setattr(module, 'database_connection', connection)
    user_id, product_id, variant_id = uuid4(), uuid4(), uuid4()
    slug = 'qa-' + uuid4().hex
    with connection() as c:
        c.execute('insert into auth.users(id) values(%s)', (user_id,))
        c.execute("insert into public.admin_profiles(user_id,role) values(%s,'admin')", (user_id,))
        c.execute("insert into public.products(id,name,slug,sku,audience,status,base_price) values(%s,'QA product',%s,%s,'mujer','published',125)", (product_id,slug,slug))
        c.execute("insert into public.product_variants(id,product_id,color,size,stock) values(%s,%s,'Negro','M',5)", (variant_id,product_id))
    main.app.dependency_overrides[require_admin] = lambda: AdminPrincipal(user_id,None,'admin','QA')
    yield TestClient(main.app), connection, product_id, variant_id, slug
    main.app.dependency_overrides.clear()


def adjustment(shop, **kwargs):
    _, connection, _, variant_id, _ = shop
    with connection() as c:
        version = c.execute('select updated_at from public.product_variants where id=%s', (variant_id,)).fetchone()['updated_at']
    return {'operation': 'add', 'quantity': 2, 'reason': 'Ingreso proveedor', 'expected_updated_at': version.isoformat(), **kwargs}


def test_stock_adjustment_movement_and_conflict(shop):
    client, connection, _, variant_id, _ = shop
    payload = adjustment(shop)
    response = client.post(f'/api/admin/inventory/{variant_id}/adjust', json=payload)
    assert response.status_code == 200, response.text
    assert (response.json()['stockBefore'],response.json()['quantityDelta'],response.json()['stock']) == (5,2,7)
    assert client.post(f'/api/admin/inventory/{variant_id}/adjust', json=payload).status_code == 409
    with connection() as c:
        row = c.execute('select * from public.stock_movements where variant_id=%s', (variant_id,)).fetchone()
        assert row['stock_before']==5 and row['stock_after']==7 and row['quantity_delta']==2
        assert row['admin_user_id'] and row['reason']=='Ingreso proveedor'


def test_negative_stock_and_missing_variant(shop):
    client, connection, _, variant_id, _ = shop
    assert client.post(f'/api/admin/inventory/{variant_id}/adjust', json=adjustment(shop,operation='remove',quantity=6)).status_code==409
    assert client.post(f'/api/admin/inventory/{uuid4()}/adjust', json=adjustment(shop)).status_code==404
    with connection() as c:
        assert c.execute('select stock from public.product_variants where id=%s', (variant_id,)).fetchone()['stock']==5
        assert c.execute('select count(*) n from public.stock_movements where variant_id=%s', (variant_id,)).fetchone()['n']==0


def test_noop_and_blank_reason(shop):
    client, _, _, variant_id, _ = shop
    response=client.post(f'/api/admin/inventory/{variant_id}/adjust',json=adjustment(shop,operation='set',stock=5))
    assert response.status_code==200 and response.json()['movementId'] is None
    assert client.post(f'/api/admin/inventory/{variant_id}/adjust',json=adjustment(shop,reason='   ')).status_code==422


def test_order_price_retry_and_alias_aggregation(shop):
    client, connection, product_id, variant_id, slug=shop
    payload={'request_key':str(uuid4()),'items':[
        {'productId':slug,'color':'Negro','size':'M','qty':1,'price':1},
        {'productId':str(product_id),'color':'negro','size':'m','qty':1,'price':1}]}
    first=client.post('/api/orders',json=payload)
    assert first.status_code==201,first.text
    assert float(first.json()['items'][0]['price'])==125
    assert first.json()['items'][0]['qty']==2
    second=client.post('/api/public/orders',json=payload)
    assert second.status_code==201 and first.json()['orderId']==second.json()['orderId']
    with connection() as c:
        assert c.execute('select stock from public.product_variants where id=%s',(variant_id,)).fetchone()['stock']==3
    payload['items'][0]['qty']=2
    assert client.post('/api/orders',json=payload).status_code==409


def test_concurrent_orders_cannot_oversell(shop):
    client, connection, _, variant_id, slug=shop
    def buy(_):
        return client.post('/api/orders',json={'request_key':str(uuid4()),'items':[{'productId':slug,'color':'Negro','size':'M','qty':4}]}).status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(buy,range(2)))==[201,409]
    with connection() as c:
        assert c.execute('select stock from public.product_variants where id=%s',(variant_id,)).fetchone()['stock']==1


def test_missing_product_and_public_contract(shop):
    client, _, _, _, slug=shop
    assert client.get('/api/products/missing-'+uuid4().hex).status_code==404
    data=client.get('/api/products/'+slug).json()
    assert data['slug']==slug and len(data['variants'])==1
    assert not {'legacy_payload','created_by','updated_by','audit_logs'}.intersection(data)
    assert any(v['product_id']==slug for v in client.get('/api/variants').json())


def test_product_edit_preserves_stock_and_requires_version(shop):
    client, connection, product_id, variant_id, slug=shop
    data=client.get(f'/api/admin/products/{product_id}').json()
    payload={**data,'expected_updated_at':data['updated_at'],'description_html':'<p>Material real</p>',
             'specifications':{'material':'Algodon'},'variants':[{**v,'stock':None} for v in data['variants']]}
    response=client.put(f'/api/admin/products/{product_id}',json=payload)
    assert response.status_code==200,response.text
    assert client.get('/api/products/'+slug).json()['specifications']['material']=='Algodon'
    assert client.put(f'/api/admin/products/{product_id}',json=payload).status_code==409
    data=response.json(); payload={**data,'expected_updated_at':data['updated_at']}
    assert client.put(f'/api/admin/products/{product_id}',json=payload).status_code==422
    with connection() as c:
        assert c.execute('select stock from public.product_variants where id=%s',(variant_id,)).fetchone()['stock']==5


def test_views_are_deduplicated_and_stats_real(shop):
    client, _, product_id, _, _=shop
    key={'event_key':str(uuid4())}
    assert client.post(f'/api/public/products/{product_id}/view',json=key).json()['recorded']
    assert not client.post(f'/api/public/products/{product_id}/view',json=key).json()['recorded']
    stats=client.get('/api/admin/dashboard')
    assert stats.status_code==200,stats.text
    assert stats.json()['totalViews']>=1 and stats.json()['summary']['units_in_stock']>=5
    assert client.get('/api/admin/dashboard?start=2026-09-10&end=2026-09-01').status_code==422


def test_stock_admin_permissions(shop):
    client, _, _, variant_id, _=shop
    main.app.dependency_overrides.clear()
    assert client.post(f'/api/admin/inventory/{variant_id}/adjust',json=adjustment(shop)).status_code==401
    main.app.dependency_overrides[require_admin]=lambda: AdminPrincipal(uuid4(),None,'viewer','QA')
    assert client.post(f'/api/admin/inventory/{variant_id}/adjust',json=adjustment(shop)).status_code==403


def test_cancellation_releases_stock_exactly_once(shop):
    client, connection, _, variant_id, slug=shop
    response=client.post('/api/orders',json={'request_key':str(uuid4()),'items':[{'productId':slug,'color':'Negro','size':'M','qty':2}]})
    order_id=response.json()['orderId']
    for _ in range(2):
        result=client.patch(f'/api/admin/orders/{order_id}/status',json={'status':'cancelled'})
        assert result.status_code==200,result.text
    assert client.patch(f'/api/admin/orders/{order_id}/status',json={'status':'confirmed'}).status_code==409
    with connection() as c:
        assert c.execute('select stock from public.product_variants where id=%s',(variant_id,)).fetchone()['stock']==5
        assert c.execute("select count(*) n from public.stock_movements where order_id=%s and movement_type='cancellation'",(order_id,)).fetchone()['n']==1


def test_preview_is_private_and_uses_storefront(shop):
    client, connection, product_id, _, slug=shop
    with connection() as c:
        c.execute("update public.products set status='draft' where id=%s",(product_id,))
    assert client.get('/api/products/'+slug).status_code==404
    preview=client.get(f'/api/admin/products/{product_id}/preview')
    assert preview.status_code==200,preview.text
    assert 'ROMIX_PRODUCT_PREVIEW' in preview.json()['html'] and 'product-detail' in preview.json()['html']
    main.app.dependency_overrides.clear()
    assert client.get(f'/api/admin/products/{product_id}/preview').status_code==401


def test_create_product_records_initial_stock(shop):
    client, connection, _, _, _=shop
    sku='new-'+uuid4().hex
    response=client.post('/api/admin/products',json={'name':'Nuevo QA','slug':sku,'sku':sku,'audience':'mujer',
        'base_price':90,'variants':[{'color':'Negro','size':'S','stock':3,'sku':'','barcode':''}]})
    assert response.status_code==201,response.text
    variant=response.json()['variants'][0]
    assert variant['stock']==3 and variant['sku'] is None
    with connection() as c:
        assert c.execute('select stock_after from public.stock_movements where variant_id=%s',(variant['id'],)).fetchone()['stock_after']==3


def test_image_order_rejects_duplicates_and_preserves_images(shop):
    client, connection, product_id, _, _=shop
    with connection() as c:
        ids=[c.execute("insert into public.product_images(product_id,source,public_url,position) values(%s,'legacy',%s,%s) returning id",
             (product_id,f'images/qa-{index}.png',index)).fetchone()['id'] for index in range(2)]
    product=client.get(f'/api/admin/products/{product_id}').json()
    payload={'expected_updated_at':product['updated_at'],'image_ids':[str(ids[0]),str(ids[0]),str(ids[1])]}
    assert client.patch(f'/api/admin/products/{product_id}/images',json=payload).status_code==422
    payload['image_ids']=[str(ids[1]),str(ids[0])]
    result=client.patch(f'/api/admin/products/{product_id}/images',json=payload)
    assert result.status_code==200,result.text
    assert [row['id'] for row in result.json()['images']]==payload['image_ids']

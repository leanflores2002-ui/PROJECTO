"""Run in the configured backend environment to invite the site owner."""
import argparse
import os
import sys
from uuid import UUID

import httpx
import psycopg
from psycopg.types.json import Jsonb


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--email', required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--admin-url', required=True, help='Public admin URL ending in /admin')
    args = parser.parse_args()
    if not args.admin_url.startswith('https://'):
        parser.error('Use the HTTPS production admin URL')
    required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    if any(not os.environ.get(key) for key in required):
        sys.exit('Missing backend configuration: ' + ', '.join(key for key in required if not os.environ.get(key)))
    email = args.email.strip().lower()
    with psycopg.connect(os.environ['DATABASE_URL']) as connection:
        existing = connection.execute('select id from auth.users where lower(email)=%s', (email,)).fetchone()
        if existing:
            user_id = existing[0]
        else:
            response = httpx.post(os.environ['SUPABASE_URL'].rstrip('/')+'/auth/v1/invite',
                headers={'apikey': os.environ['SUPABASE_SERVICE_ROLE_KEY'],
                         'Authorization': 'Bearer '+os.environ['SUPABASE_SERVICE_ROLE_KEY']},
                json={'email': email, 'data': {'display_name': args.name}},
                params={'redirect_to': args.admin_url.rstrip('/')+'/activate'}, timeout=30)
            if not response.is_success:
                sys.exit(f'Invitation failed (HTTP {response.status_code}); no role granted.')
            user_id = UUID(response.json()['id'])
        connection.execute('''insert into public.admin_profiles(user_id,display_name,role,is_active)
            values(%s,%s,'superadmin',true) on conflict(user_id) do update
            set display_name=excluded.display_name,role='superadmin',is_active=true''', (user_id,args.name))
        connection.execute('''insert into public.audit_logs(admin_user_id,action,entity_type,entity_id,details)
            values(%s,'superadmin_bootstrap','admin',%s,%s)''',
            (user_id,user_id,Jsonb({'source':'backend_cli'})))
        verified = connection.execute("select role,is_active from public.admin_profiles where user_id=%s", (user_id,)).fetchone()
        if verified != ('superadmin', True):
            raise RuntimeError('Superadmin verification failed')
    print('Superadmin access verified. New accounts receive an activation invitation by email.')


if __name__ == '__main__':
    main()

-- Local users. Shared password: Dev12345!
-- These accounts are intentionally deterministic and must never be reused outside local development.

begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'owner@geecole.local',
    crypt('Dev12345!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mamadou Diallo"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'admin@geecole.local',
    crypt('Dev12345!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aïssatou Camara"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'secretary@geecole.local',
    crypt('Dev12345!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Fatoumata Bah"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'owner.kankan@geecole.local',
    crypt('Dev12345!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mariama Condé"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  );

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id,
  id,
  email,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004'
);

insert into public.profiles (id, full_name, phone)
values
  ('10000000-0000-0000-0000-000000000001', 'Mamadou Diallo', '+224 620 00 00 01'),
  ('10000000-0000-0000-0000-000000000002', 'Aïssatou Camara', '+224 620 00 00 02'),
  ('10000000-0000-0000-0000-000000000003', 'Fatoumata Bah', '+224 620 00 00 03'),
  ('10000000-0000-0000-0000-000000000004', 'Mariama Condé', '+224 622 00 00 04')
on conflict (id) do update
set full_name = excluded.full_name,
    phone = excluded.phone;

commit;

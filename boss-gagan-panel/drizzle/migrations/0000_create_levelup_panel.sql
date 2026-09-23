-- Core tables. All access happens through trusted server code (service role),
-- so RLS is enabled with no public policies.

CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  slots INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 day',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days'
);
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  uid TEXT NOT NULL DEFAULT '',
  player TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  level INT NOT NULL DEFAULT 0,
  exp INT NOT NULL DEFAULT 0,
  matches INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IDLE',
  start_level INT NOT NULL DEFAULT 0,
  start_exp INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bots TO service_role;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INT NOT NULL DEFAULT 59,
  days INT NOT NULL DEFAULT 1,
  slots INT NOT NULL DEFAULT 1,
  extra_slot_price INT NOT NULL DEFAULT 50,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_users (username, password_hash, slots, expires_at, is_owner)
VALUES ('BOSSXGAGAN', encode(sha256(convert_to('BOSSXGAGAN:gagan@2026','utf8')),'hex'), 999, now() + interval '3650 days', true);

INSERT INTO public.plans (name, price, days, slots, extra_slot_price, sort_order) VALUES
 ('PLAN 01', 59, 1, 1, 50, 1),
 ('PLAN 02', 169, 3, 1, 50, 2),
 ('PLAN 03', 749, 15, 1, 50, 3),
 ('PLAN 04', 1399, 30, 1, 50, 4);

INSERT INTO public.settings (key, value) VALUES
 ('brand_name', 'BOSS GAGAN'),
 ('brand_sub', 'LEVEL UP PANEL'),
 ('logo_url', ''),
 ('hero_url', ''),
 ('telegram_username', 'BOSSXGAGAN'),
 ('hero_title', 'LEVEL UP FAST, SAFE & FULLY AUTOMATIC'),
 ('hero_text', 'Plan lo, owner se account milega, phir apne private dashboard se apne hi Free Fire IDs ka live EXP, level aur matches track karo.'),
 ('footer_text', 'Free Fire Level Up Service'),
 ('buy_template', 'Hello {owner}, mujhe {plan} lena hai ({days} Day Level Up Access) - Price {price} INR, Slots: {slots}. Total: {total} INR'),
 ('music_url', ''),
 ('music_enabled', 'false');
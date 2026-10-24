-- Tahap 6a: level (XP) dan stiker

create table public.levels (
  level integer primary key,
  name text not null,
  min_xp integer not null,
  perks text not null default ''
);
insert into public.levels (level, name, min_xp, perks) values
  (1, 'Green Bean', 0, 'Starter stickers'),
  (2, 'Light Roast', 200, 'Level 2 stickers · Discord role'),
  (3, 'Medium Roast', 600, 'More stickers · Discord role'),
  (4, 'Dark Roast', 1500, 'Early access to new menu'),
  (5, 'Solu Legend', 3000, 'Legend sticker · event invites');

create table public.stickers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unlock_level integer references public.levels(level),   -- kosong = stiker musiman
  season text,                                            -- mis. 'Season 1'
  image text not null default '/img/solu-wave.png',
  sort integer not null default 0,
  active boolean not null default true
);
insert into public.stickers (name, unlock_level, season, sort) values
  ('Solu says hi', 1, null, 1),
  ('Cheers!', 1, null, 2),
  ('Good morning', 2, null, 3),
  ('Sticker 4', 3, null, 4),
  ('Sticker 5', 3, null, 5),
  ('Sticker 6', 3, null, 6),
  ('Sticker 7', 4, null, 7),
  ('Sticker 8', 4, null, 8),
  ('Sticker 9', 4, null, 9),
  ('Sticker 10', 5, null, 10),
  ('Sticker 11', 5, null, 11),
  ('Season 1 sticker', null, 'Season 1', 12);

alter table public.levels enable row level security;
alter table public.stickers enable row level security;
create policy "levels readable" on public.levels for select using (true);
create policy "stickers readable" on public.stickers for select using (active);

-- XP = semua beans yang pernah didapat + 10 per kunjungan + 100 per kartu stamp selesai.
-- (+50 profil lengkap, +30 Discord, +10 per akun sosial menyusul setelah fitur profil ada.)
create view public.member_xp with (security_invoker = true) as
select p.id as user_id,
  (
    coalesce((select sum(l.delta) from public.ledger l where l.user_id = p.id and l.kind = 'beans' and l.delta > 0), 0)
    + 10 * (select count(*) from public.transactions t where t.user_id = p.id)
    + 100 * (coalesce((select sum(l.delta) from public.ledger l where l.user_id = p.id and l.kind = 'stamp'), 0)
             / (select value from public.loyalty_config where key = 'stamps_per_card'))
  )::int as xp
from public.profiles p;

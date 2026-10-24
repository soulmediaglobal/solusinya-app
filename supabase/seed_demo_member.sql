-- DATA DUMMY untuk satu akun tes (BUKAN migrasi, jalankan manual di SQL Editor).
-- Mengisi: 33 kunjungan (> Rp 5 juta), beans, stamp, voucher berbagai status, bonus, profil lengkap, akun sosial.
-- Ganti GANTI_USERNAME di baris paling bawah dengan username akun tes, lalu Run.
-- Kalau sudah pernah dijalankan dan mau diulang dari nol, ganti false jadi true di baris paling bawah.

create or replace function pg_temp.seed_demo(p_username text, p_reset boolean)
returns table(metric text, nilai text)
language plpgsql as $$
declare
  uid uuid;
  tx uuid;
  n int; d int; outlet text; amt int;
  base timestamptz;
  ts timestamptz;
  r_upgrade uuid; r_drink uuid; r_cookie uuid; r_beans uuid;
begin
  select id into uid from public.profiles where username = lower(p_username);
  if uid is null then raise exception 'Username % tidak ditemukan', p_username; end if;

  if exists (select 1 from public.transactions where user_id = uid) then
    if not p_reset then
      raise exception 'Akun ini sudah punya transaksi. Ganti p_reset jadi true kalau mau diulang dari nol.';
    end if;
    delete from public.vouchers where user_id = uid;
    delete from public.ledger where user_id = uid;
    delete from public.transactions where user_id = uid;
    delete from public.social_accounts where user_id = uid;
  end if;

  select id into r_upgrade from public.rewards where name = 'Free size upgrade';
  select id into r_drink   from public.rewards where name = 'Free drink';
  select id into r_cookie  from public.rewards where name = 'Free cookie';
  select id into r_beans   from public.rewards where name = 'Coffee beans 200g';

  base := date_trunc('day', now());

  -- 33 kunjungan: (hari lalu, outlet, nominal Rp). Urut dari yang paling lama.
  n := 0;
  for d, outlet, amt in
    select * from (values
      (118,'DRA', 85000),(112,'DRA',142000),(105,'DRA', 56000),(99,'JAT',210000),(92,'DRA',178000),
      ( 88,'DRA', 64000),( 83,'DRA',320000),( 78,'PAM',125000),(74,'DRA', 98000),(69,'DRA',245000),
      ( 66,'DRA', 72000),( 61,'DRA',190000),( 57,'JAT',135000),(53,'DRA',410000),(49,'DRA',160000),
      ( 46,'DRA', 88000),( 42,'DRA',225000),( 39,'PAM',118000),(36,'DRA',296000),(33,'DRA',152000),
      ( 30,'DRA', 67000),( 27,'REN',380000),( 24,'DRA',134000),(21,'DRA',205000),(18,'DRA',172000),
      ( 15,'DRA', 94000),( 12,'JAT',268000),( 10,'DRA',143000),( 7,'DRA',186000),( 5,'DRA',232000),
      (  3,'DRA', 79000),(  2,'DRA',305000),( 1,'DRA',121000)
    ) as t(d, o, a)
  loop
    n := n + 1;
    ts := base - make_interval(days => d) + make_interval(hours => 9 + (n * 5) % 11, mins => (n * 13) % 60);
    insert into public.transactions (user_id, outlet_code, amount_rp, created_by, created_at)
      values (uid, outlet, amt, uid, ts) returning id into tx;
    insert into public.ledger (user_id, kind, delta, reason, transaction_id, created_at)
      values (uid, 'stamp', 1, 'transaction', tx, ts);
    insert into public.ledger (user_id, kind, delta, reason, transaction_id, created_at)
      values (uid, 'beans', amt / 1000, 'transaction', tx, ts);
  end loop;

  -- Voucher dari milestone stamp (stamp ke-5 = size upgrade, ke-10 = free drink), tiap kartu 10 stamp.
  -- Kunjungan ke-5, 10, 15, 20, 25, 30 -> 6 voucher dengan status berbeda-beda.
  insert into public.vouchers (user_id, reward_id, source, source_detail, status, created_at, expires_at, used_at, used_outlet, used_by) values
    (uid, r_upgrade, 'stamp',  5, 'used',      base - interval '92 days', base - interval '62 days', base - interval '90 days', 'DRA', uid),
    (uid, r_drink,   'stamp', 10, 'used',      base - interval '69 days', base - interval '39 days', base - interval '66 days', 'DRA', uid),
    (uid, r_upgrade, 'stamp',  5, 'available', base - interval '49 days', base - interval '19 days', null, null, null),   -- sudah kedaluwarsa
    (uid, r_drink,   'stamp', 10, 'used',      base - interval '33 days', base - interval '3 days',  base - interval '31 days', 'DRA', uid),
    (uid, r_upgrade, 'stamp',  5, 'available', base - interval '18 days', base + interval '12 days', null, null, null),
    (uid, r_drink,   'stamp', 10, 'available', base - interval '5 days',  base + interval '25 days', null, null, null);

  -- Penukaran beans: cookie (100) dan free drink (300) sudah dipakai; upgrade (150) dan beans 200g (600) masih tersedia.
  insert into public.ledger (user_id, kind, delta, reason, created_at) values
    (uid, 'beans', -100, 'redeem', base - interval '60 days'),
    (uid, 'beans', -300, 'redeem', base - interval '40 days'),
    (uid, 'beans', -150, 'redeem', base - interval '8 days'),
    (uid, 'beans', -600, 'redeem', base - interval '4 days');
  insert into public.vouchers (user_id, reward_id, source, source_detail, status, created_at, expires_at, used_at, used_outlet, used_by) values
    (uid, r_cookie,  'beans', 100, 'used',      base - interval '60 days', base - interval '30 days', base - interval '59 days', 'DRA', uid),
    (uid, r_drink,   'beans', 300, 'used',      base - interval '40 days', base - interval '10 days', base - interval '38 days', 'JAT', uid),
    (uid, r_upgrade, 'beans', 150, 'available', base - interval '8 days',  base + interval '22 days', null, null, null),
    (uid, r_beans,   'beans', 600, 'available', base - interval '4 days',  base + interval '26 days', null, null, null);

  -- Bonus manual (reason 'adjustment' dan 'reward')
  insert into public.ledger (user_id, kind, delta, reason, created_at) values
    (uid, 'beans',  50, 'adjustment', base - interval '118 days'),
    (uid, 'beans', 200, 'reward',     base - interval '40 days');

  -- Profil lengkap (hanya mengisi kalau masih kosong) + 3 akun sosial (telegram & facebook sengaja dikosongkan untuk dites)
  update public.profiles
    set whatsapp = coalesce(nullif(whatsapp, ''), '6281200000001'),
        birthday = coalesce(birthday, date '1995-06-15')
    where id = uid;
  insert into public.social_accounts (user_id, platform, handle) values
    (uid, 'discord', 'solu.tester'),
    (uid, 'instagram', 'solu.tester'),
    (uid, 'tiktok', 'solu.tester')
  on conflict do nothing;

  return query
    select 'username', p_username
    union all select 'total belanja (Rp)', (select sum(amount_rp)::text from public.transactions where user_id = uid)
    union all select 'jumlah kunjungan', (select count(*)::text from public.transactions where user_id = uid)
    union all select 'stamp / beans saat ini', (select stamps::text || ' stamp / ' || beans::text || ' beans' from public.member_balances where user_id = uid)
    union all select 'XP', (select xp::text from public.member_xp where user_id = uid)
    union all select 'level', (select name from public.levels where min_xp <= (select xp from public.member_xp where user_id = uid) order by min_xp desc limit 1)
    union all select 'voucher tersedia', (select count(*)::text from public.vouchers where user_id = uid and status = 'available' and expires_at > now())
    union all select 'voucher terpakai', (select count(*)::text from public.vouchers where user_id = uid and status = 'used')
    union all select 'voucher kedaluwarsa', (select count(*)::text from public.vouchers where user_id = uid and status = 'available' and expires_at <= now());
end $$;

-- GANTI 'GANTI_USERNAME' dengan username akun tes kamu (huruf kecil, tanpa @).
select * from pg_temp.seed_demo('GANTI_USERNAME', false);

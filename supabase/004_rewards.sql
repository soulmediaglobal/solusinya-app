-- Tahap 4: rewards, voucher, redeem, kode kasir

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  beans_cost integer check (beans_cost > 0),   -- kosong = tidak dijual dengan beans
  sort integer not null default 0,
  active boolean not null default true
);

-- Stamp ke-N di kartu memberi reward ini (kartu berulang tiap 10 stamp)
create table public.stamp_milestones (
  position integer primary key check (position between 1 and 10),
  reward_id uuid not null references public.rewards(id)
);

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.rewards(id),
  source text not null check (source in ('stamp', 'beans')),
  source_detail integer not null,            -- posisi stamp, atau jumlah beans yang dipakai
  status text not null default 'available' check (status in ('available', 'active', 'used')),
  expires_at timestamptz not null default now() + interval '30 days',
  code text,
  code_expires_at timestamptz,
  used_at timestamptz,
  used_outlet text references public.outlets(code),
  used_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index vouchers_code_idx on public.vouchers (code) where code is not null;
create index vouchers_user_idx on public.vouchers (user_id, created_at desc);

alter table public.rewards enable row level security;
alter table public.stamp_milestones enable row level security;
alter table public.vouchers enable row level security;

create policy "rewards readable" on public.rewards for select using (active);
create policy "milestones readable" on public.stamp_milestones for select using (true);
create policy "own vouchers" on public.vouchers for select using (auth.uid() = user_id or public.is_admin());
-- Tidak ada policy tulis: voucher hanya berubah lewat fungsi di bawah.

insert into public.rewards (name, description, beans_cost, sort) values
  ('Free cookie', 'Any cookie in store', 100, 1),
  ('Free size upgrade', 'Upgrade any drink one size', 150, 2),
  ('Free drink', 'Any drink on the menu', 300, 3),
  ('Coffee beans 200g', 'One bag of house beans', 600, 4);

insert into public.stamp_milestones (position, reward_id)
  select 5, id from public.rewards where name = 'Free size upgrade';
insert into public.stamp_milestones (position, reward_id)
  select 10, id from public.rewards where name = 'Free drink';

-- Catat transaksi: 1 stamp + beans; kalau stamp mencapai milestone, voucher dibuat otomatis.
create or replace function public.record_transaction(p_member text, p_amount integer, p_outlet text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid; tx uuid; per integer; beans integer; per_card integer;
  total integer; pos integer; ms public.stamp_milestones; unlocked text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  select id into uid from public.profiles
    where member_id = upper(trim(p_member)) or username = lower(trim(p_member));
  if uid is null then raise exception 'member not found'; end if;
  perform 1 from public.profiles where id = uid for update;   -- satu transaksi per member sekaligus

  select value into per from public.loyalty_config where key = 'rp_per_bean';
  select value into per_card from public.loyalty_config where key = 'stamps_per_card';
  beans := p_amount / per;

  insert into public.transactions (user_id, outlet_code, amount_rp, created_by)
    values (uid, p_outlet, p_amount, auth.uid()) returning id into tx;
  insert into public.ledger (user_id, kind, delta, reason, transaction_id)
    values (uid, 'stamp', 1, 'transaction', tx);
  if beans > 0 then
    insert into public.ledger (user_id, kind, delta, reason, transaction_id)
      values (uid, 'beans', beans, 'transaction', tx);
  end if;

  select coalesce(sum(delta), 0) into total from public.ledger where user_id = uid and kind = 'stamp';
  pos := ((total - 1) % per_card) + 1;
  select * into ms from public.stamp_milestones where position = pos;
  if found then
    insert into public.vouchers (user_id, reward_id, source, source_detail)
      values (uid, ms.reward_id, 'stamp', pos);
    select name into unlocked from public.rewards where id = ms.reward_id;
  end if;

  return jsonb_build_object('transaction_id', tx, 'stamps', 1, 'beans', beans, 'reward_unlocked', unlocked);
end $$;

-- Member menukar beans dengan reward (jadi voucher di My rewards)
create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.rewards; bal integer; vid uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  perform 1 from public.profiles where id = uid for update;
  select * into r from public.rewards where id = p_reward_id and active and beans_cost is not null;
  if not found then raise exception 'reward not available'; end if;
  select coalesce(sum(delta), 0) into bal from public.ledger where user_id = uid and kind = 'beans';
  if bal < r.beans_cost then raise exception 'not enough beans'; end if;
  insert into public.ledger (user_id, kind, delta, reason) values (uid, 'beans', -r.beans_cost, 'redeem');
  insert into public.vouchers (user_id, reward_id, source, source_detail)
    values (uid, r.id, 'beans', r.beans_cost) returning id into vid;
  return jsonb_build_object('voucher_id', vid, 'beans_after', bal - r.beans_cost);
end $$;

-- Member menekan "Use": kode berlaku 10 menit. Kalau kode lama masih berlaku, kode yang sama dikembalikan.
create or replace function public.activate_voucher(p_voucher_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); v public.vouchers; c text; i integer;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into v from public.vouchers where id = p_voucher_id and user_id = uid for update;
  if not found then raise exception 'voucher not found'; end if;
  if v.status = 'used' then raise exception 'already used'; end if;
  if v.expires_at < now() then raise exception 'voucher expired'; end if;
  if v.status = 'active' and v.code_expires_at > now() then
    return jsonb_build_object('code', v.code, 'code_expires_at', v.code_expires_at);
  end if;
  loop
    c := 'SOLU-';
    for i in 1..4 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.vouchers where code = c);
  end loop;
  update public.vouchers
    set status = 'active', code = c, code_expires_at = now() + interval '10 minutes'
    where id = v.id;
  return jsonb_build_object('code', c, 'code_expires_at', now() + interval '10 minutes');
end $$;

-- Admin: lihat kode tanpa memakainya
create or replace function public.peek_voucher(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.vouchers; r public.rewards; p public.profiles; state text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into v from public.vouchers where code = upper(trim(p_code));
  if not found then raise exception 'code not found'; end if;
  select * into r from public.rewards where id = v.reward_id;
  select * into p from public.profiles where id = v.user_id;
  state := case
    when v.status = 'used' then 'used'
    when v.status = 'active' and v.code_expires_at > now() and v.expires_at > now() then 'valid'
    else 'expired' end;
  return jsonb_build_object('state', state, 'reward', r.name, 'username', p.username,
    'full_name', p.full_name, 'member_id', p.member_id, 'used_at', v.used_at);
end $$;

-- Admin (kasir): tandai voucher terpakai
create or replace function public.use_voucher(p_code text, p_outlet text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.vouchers; r public.rewards; p public.profiles;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into v from public.vouchers where code = upper(trim(p_code)) for update;
  if not found then raise exception 'code not found'; end if;
  if v.status = 'used' then raise exception 'already used'; end if;
  if v.status <> 'active' or v.code_expires_at < now() or v.expires_at < now() then
    raise exception 'code expired';
  end if;
  update public.vouchers
    set status = 'used', used_at = now(), used_outlet = p_outlet, used_by = auth.uid()
    where id = v.id;
  select * into r from public.rewards where id = v.reward_id;
  select * into p from public.profiles where id = v.user_id;
  return jsonb_build_object('reward', r.name, 'username', p.username, 'full_name', p.full_name);
end $$;

revoke execute on function public.record_transaction(text, integer, text) from public, anon;
revoke execute on function public.redeem_reward(uuid) from public, anon;
revoke execute on function public.activate_voucher(uuid) from public, anon;
revoke execute on function public.peek_voucher(text) from public, anon;
revoke execute on function public.use_voucher(text, text) from public, anon;
grant execute on function public.record_transaction(text, integer, text) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.activate_voucher(uuid) to authenticated;
grant execute on function public.peek_voucher(text) to authenticated;
grant execute on function public.use_voucher(text, text) to authenticated;

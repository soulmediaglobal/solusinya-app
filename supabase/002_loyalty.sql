-- Tahap 3: inti loyalty (transaksi, ledger, saldo)

alter table public.profiles add column is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create table public.loyalty_config (key text primary key, value integer not null);
insert into public.loyalty_config values ('rp_per_bean', 1000), ('stamps_per_card', 10);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  outlet_code text not null references public.outlets(code),
  amount_rp integer not null check (amount_rp > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('stamp', 'beans')),
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('transaction', 'redeem', 'reward', 'adjustment')),
  transaction_id uuid references public.transactions(id),
  created_at timestamptz not null default now()
);
create index ledger_user_idx on public.ledger (user_id, created_at desc);
create index transactions_user_idx on public.transactions (user_id, created_at desc);

alter table public.loyalty_config enable row level security;
alter table public.transactions enable row level security;
alter table public.ledger enable row level security;

create policy "config readable" on public.loyalty_config for select using (true);
create policy "own transactions" on public.transactions for select using (auth.uid() = user_id or public.is_admin());
create policy "own ledger" on public.ledger for select using (auth.uid() = user_id or public.is_admin());
create policy "admin reads profiles" on public.profiles for select using (public.is_admin());

create view public.member_balances with (security_invoker = true) as
select user_id,
  coalesce(sum(delta) filter (where kind = 'stamp'), 0)::int as stamps,
  coalesce(sum(delta) filter (where kind = 'beans'), 0)::int as beans,
  coalesce(sum(delta) filter (where kind = 'beans' and delta > 0), 0)::int as lifetime_beans
from public.ledger group by user_id;

create or replace function public.record_transaction(p_member text, p_amount integer, p_outlet text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid; tx uuid; per integer; beans integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  select id into uid from public.profiles
    where member_id = upper(trim(p_member)) or username = lower(trim(p_member));
  if uid is null then raise exception 'member not found'; end if;
  select value into per from public.loyalty_config where key = 'rp_per_bean';
  beans := p_amount / per;
  insert into public.transactions (user_id, outlet_code, amount_rp, created_by)
    values (uid, p_outlet, p_amount, auth.uid()) returning id into tx;
  insert into public.ledger (user_id, kind, delta, reason, transaction_id)
    values (uid, 'stamp', 1, 'transaction', tx);
  if beans > 0 then
    insert into public.ledger (user_id, kind, delta, reason, transaction_id)
      values (uid, 'beans', beans, 'transaction', tx);
  end if;
  return jsonb_build_object('transaction_id', tx, 'stamps', 1, 'beans', beans);
end $$;

revoke execute on function public.record_transaction(text, integer, text) from public, anon;
grant execute on function public.record_transaction(text, integer, text) to authenticated;

-- update public.profiles set is_admin = true where username = 'admin';

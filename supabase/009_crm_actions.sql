-- Tahap 7c: data dan aksi untuk CRM
--   * izin promo (opt-in) dan sumber daftar di profil
--   * daftar menu + item per transaksi (opsional di kasir)
--   * catatan, label, tindak lanjut per member
--   * aksi admin (bonus beans, voucher hadiah) dengan audit log
--   * kampanye WhatsApp dan pelacakan hasilnya
--   * biaya reward (opsional)

-- ---------------------------------------------------------------- profil
alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists signup_source text;

alter table public.profiles drop constraint if exists profiles_signup_source_check;
alter table public.profiles add constraint profiles_signup_source_check
  check (signup_source is null or signup_source in ('instagram', 'tiktok', 'friend', 'store_qr', 'other'));

-- Pendaftaran membaca "source" dari metadata (nilai di luar daftar diabaikan).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := new.raw_user_meta_data;
begin
  insert into public.profiles (id, member_id, username, full_name, whatsapp, outlet_code, signup_source)
  values (
    new.id,
    public.generate_member_id(m->>'outlet_code'),
    lower(m->>'username'),
    m->>'full_name',
    nullif(m->>'whatsapp', ''),
    m->>'outlet_code',
    case when m->>'source' in ('instagram', 'tiktok', 'friend', 'store_qr', 'other') then m->>'source' else null end
  );
  return new;
end $$;

-- Member menyalakan/mematikan izin promo di profilnya sendiri.
create or replace function public.set_marketing_opt_in(p_value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.profiles
    set marketing_opt_in = coalesce(p_value, false), marketing_opt_in_at = now()
    where id = auth.uid();
end $$;
revoke execute on function public.set_marketing_opt_in(boolean) from public, anon;
grant execute on function public.set_marketing_opt_in(boolean) to authenticated;

-- ---------------------------------------------------------------- reward
alter table public.rewards add column if not exists unit_cost integer check (unit_cost is null or unit_cost >= 0);

-- Voucher hadiah dari admin
alter table public.vouchers drop constraint if exists vouchers_source_check;
alter table public.vouchers add constraint vouchers_source_check check (source in ('stamp', 'beans', 'gift'));

-- ---------------------------------------------------------------- audit
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_name text,
  action text not null,
  target_user uuid references public.profiles(id) on delete set null,
  target_name text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;
drop policy if exists "admin reads audit" on public.audit_log;
create policy "admin reads audit" on public.audit_log for select using (public.is_admin());

create or replace function public.write_audit(p_action text, p_target uuid, p_details jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (admin_id, admin_name, action, target_user, target_name, details)
  values (
    auth.uid(),
    (select username::text from public.profiles where id = auth.uid()),
    p_action,
    p_target,
    (select username::text from public.profiles where id = p_target),
    coalesce(p_details, '{}'::jsonb)
  );
end $$;
revoke execute on function public.write_audit(text, uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- menu
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  category text not null default 'Drinks' check (length(trim(category)) between 1 and 30),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists menu_items_name_idx on public.menu_items (lower(name));

create table if not exists public.transaction_items (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  qty integer not null default 1 check (qty between 1 and 99),
  primary key (transaction_id, menu_item_id)
);
create index if not exists transaction_items_item_idx on public.transaction_items (menu_item_id);

alter table public.menu_items enable row level security;
alter table public.transaction_items enable row level security;
drop policy if exists "admin reads menu" on public.menu_items;
drop policy if exists "admin reads items" on public.transaction_items;
create policy "admin reads menu" on public.menu_items for select using (public.is_admin());
create policy "admin reads items" on public.transaction_items for select using (public.is_admin());

-- Simpan menu (id kosong = baru).
create or replace function public.admin_save_menu_item(p_id uuid, p_name text, p_category text, p_sort integer, p_active boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_id is null then
    rid := gen_random_uuid();
    insert into public.menu_items (id, name, category, sort, active)
    values (rid, trim(p_name), coalesce(nullif(trim(p_category), ''), 'Drinks'), coalesce(p_sort, 0), coalesce(p_active, true));
  else
    update public.menu_items
      set name = trim(p_name), category = coalesce(nullif(trim(p_category), ''), category), sort = coalesce(p_sort, sort), active = coalesce(p_active, active)
      where id = p_id;
    if not found then raise exception 'menu item not found'; end if;
    rid := p_id;
  end if;
  perform public.write_audit('menu.save', null, jsonb_build_object('item', trim(p_name), 'active', p_active));
  return rid;
end $$;
revoke execute on function public.admin_save_menu_item(uuid, text, text, integer, boolean) from public, anon;
grant execute on function public.admin_save_menu_item(uuid, text, text, integer, boolean) to authenticated;

-- ---------------------------------------------------------------- transaksi (dengan item opsional)
drop function if exists public.record_transaction(text, integer, text);

create or replace function public.record_transaction(p_member text, p_amount integer, p_outlet text, p_items jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid; tx uuid; per integer; beans integer; per_card integer;
  total integer; pos integer; ms public.stamp_milestones; unlocked text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  uid := (select id from public.profiles where member_id = upper(trim(p_member)) or username = lower(trim(p_member)));
  if uid is null then raise exception 'member not found'; end if;
  perform 1 from public.profiles where id = uid for update;   -- satu transaksi per member sekaligus

  per := (select value from public.loyalty_config where key = 'rp_per_bean');
  per_card := (select value from public.loyalty_config where key = 'stamps_per_card');
  beans := p_amount / per;

  tx := gen_random_uuid();
  insert into public.transactions (id, user_id, outlet_code, amount_rp, created_by)
    values (tx, uid, p_outlet, p_amount, auth.uid());
  insert into public.ledger (user_id, kind, delta, reason, transaction_id)
    values (uid, 'stamp', 1, 'transaction', tx);
  if beans > 0 then
    insert into public.ledger (user_id, kind, delta, reason, transaction_id)
      values (uid, 'beans', beans, 'transaction', tx);
  end if;

  -- Item (opsional): [{"id": "<menu uuid>", "qty": 2}, ...]; item yang tidak dikenal diabaikan.
  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    insert into public.transaction_items (transaction_id, menu_item_id, qty)
    select tx, m.id, least(99, greatest(1, sum(coalesce((e->>'qty')::int, 1))))
    from jsonb_array_elements(p_items) e
    join public.menu_items m on m.id::text = e->>'id'
    group by m.id;
  end if;

  total := (select coalesce(sum(delta), 0) from public.ledger where user_id = uid and kind = 'stamp');
  pos := ((total - 1) % per_card) + 1;
  ms := (select m from public.stamp_milestones m where m.position = pos);
  if ms.position is not null then
    insert into public.vouchers (user_id, reward_id, source, source_detail)
      values (uid, ms.reward_id, 'stamp', pos);
    unlocked := (select name from public.rewards where id = ms.reward_id);
  end if;

  return jsonb_build_object('transaction_id', tx, 'stamps', 1, 'beans', beans, 'reward_unlocked', unlocked);
end $$;
revoke execute on function public.record_transaction(text, integer, text, jsonb) from public, anon;
grant execute on function public.record_transaction(text, integer, text, jsonb) to authenticated;

-- ---------------------------------------------------------------- catatan, label, tindak lanjut
create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author uuid references public.profiles(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 1000),
  due_on date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists crm_notes_user_idx on public.crm_notes (user_id, created_at desc);
create index if not exists crm_notes_due_idx on public.crm_notes (due_on) where due_on is not null and not done;

create table if not exists public.crm_tags (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null check (tag ~ '^[a-z0-9][a-z0-9 _-]{0,23}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);

alter table public.crm_notes enable row level security;
alter table public.crm_tags enable row level security;
drop policy if exists "admin reads notes" on public.crm_notes;
drop policy if exists "admin reads tags" on public.crm_tags;
create policy "admin reads notes" on public.crm_notes for select using (public.is_admin());
create policy "admin reads tags" on public.crm_tags for select using (public.is_admin());

create or replace function public.crm_add_note(p_username text, p_body text, p_due date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid; nid uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  uid := (select id from public.profiles where username = lower(trim(p_username)));
  if uid is null then raise exception 'member not found'; end if;
  nid := gen_random_uuid();
  insert into public.crm_notes (id, user_id, author, body, due_on)
    values (nid, uid, auth.uid(), trim(p_body), p_due);
  perform public.write_audit(case when p_due is null then 'note.add' else 'followup.add' end, uid, jsonb_build_object('due', p_due));
  return nid;
end $$;

create or replace function public.crm_set_note_done(p_id uuid, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.crm_notes set done = coalesce(p_done, false) where id = p_id;
end $$;

create or replace function public.crm_delete_note(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  uid := (select user_id from public.crm_notes where id = p_id);
  delete from public.crm_notes where id = p_id;
  perform public.write_audit('note.delete', uid, '{}'::jsonb);
end $$;

create or replace function public.crm_set_tags(p_username text, p_tags text[])
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  uid := (select id from public.profiles where username = lower(trim(p_username)));
  if uid is null then raise exception 'member not found'; end if;
  delete from public.crm_tags where user_id = uid;
  insert into public.crm_tags (user_id, tag)
  select distinct uid, t from (
    select lower(trim(x)) as t from unnest(coalesce(p_tags, '{}'::text[])) x
  ) s where t <> '' limit 8;
  perform public.write_audit('tags.set', uid, jsonb_build_object('tags', to_jsonb(p_tags)));
end $$;

revoke execute on function public.crm_add_note(text, text, date) from public, anon;
revoke execute on function public.crm_set_note_done(uuid, boolean) from public, anon;
revoke execute on function public.crm_delete_note(uuid) from public, anon;
revoke execute on function public.crm_set_tags(text, text[]) from public, anon;
grant execute on function public.crm_add_note(text, text, date) to authenticated;
grant execute on function public.crm_set_note_done(uuid, boolean) to authenticated;
grant execute on function public.crm_delete_note(uuid) to authenticated;
grant execute on function public.crm_set_tags(text, text[]) to authenticated;

-- ---------------------------------------------------------------- aksi admin (dengan audit)
create or replace function public.crm_grant_beans(p_username text, p_beans integer, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid; bal integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_beans is null or p_beans = 0 or abs(p_beans) > 100000 then raise exception 'invalid beans amount'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'a reason is required'; end if;
  uid := (select id from public.profiles where username = lower(trim(p_username)));
  if uid is null then raise exception 'member not found'; end if;
  perform 1 from public.profiles where id = uid for update;
  bal := (select coalesce(sum(delta), 0) from public.ledger where user_id = uid and kind = 'beans');
  if bal + p_beans < 0 then raise exception 'balance would go below zero'; end if;
  insert into public.ledger (user_id, kind, delta, reason) values (uid, 'beans', p_beans, 'adjustment');
  perform public.write_audit('beans.grant', uid, jsonb_build_object('beans', p_beans, 'reason', trim(p_reason)));
  return bal + p_beans;
end $$;

create or replace function public.crm_grant_voucher(p_username text, p_reward uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid; vid uuid; rname text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'a reason is required'; end if;
  uid := (select id from public.profiles where username = lower(trim(p_username)));
  if uid is null then raise exception 'member not found'; end if;
  rname := (select name from public.rewards where id = p_reward and active);
  if rname is null then raise exception 'reward not found'; end if;
  vid := gen_random_uuid();
  insert into public.vouchers (id, user_id, reward_id, source, source_detail)
    values (vid, uid, p_reward, 'gift', 0);
  perform public.write_audit('voucher.grant', uid, jsonb_build_object('reward', rname, 'reason', trim(p_reason)));
  return vid;
end $$;

revoke execute on function public.crm_grant_beans(text, integer, text) from public, anon;
revoke execute on function public.crm_grant_voucher(text, uuid, text) from public, anon;
grant execute on function public.crm_grant_beans(text, integer, text) to authenticated;
grant execute on function public.crm_grant_voucher(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------- kampanye
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  message text not null check (length(trim(message)) between 1 and 1000),
  segment text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.campaign_recipients (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz,
  primary key (campaign_id, user_id)
);
alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;
drop policy if exists "admin reads campaigns" on public.campaigns;
drop policy if exists "admin reads recipients" on public.campaign_recipients;
create policy "admin reads campaigns" on public.campaigns for select using (public.is_admin());
create policy "admin reads recipients" on public.campaign_recipients for select using (public.is_admin());

-- Penerima hanya member yang setuju promo dan punya nomor WhatsApp; sisanya dilewati.
create or replace function public.crm_create_campaign(p_name text, p_message text, p_segment text, p_usernames text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare cid uuid; picked integer; asked integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  asked := coalesce(array_length(p_usernames, 1), 0);
  if asked = 0 then raise exception 'choose at least one member'; end if;
  if asked > 1000 then raise exception 'too many recipients'; end if;
  cid := gen_random_uuid();
  insert into public.campaigns (id, name, message, segment, created_by)
    values (cid, trim(p_name), trim(p_message), nullif(trim(p_segment), ''), auth.uid());
  insert into public.campaign_recipients (campaign_id, user_id)
  select cid, p.id from public.profiles p
  where p.username::text = any (select lower(trim(x)) from unnest(p_usernames) x)
    and p.marketing_opt_in and p.whatsapp is not null and p.whatsapp <> '';
  picked := (select count(*) from public.campaign_recipients where campaign_id = cid);
  perform public.write_audit('campaign.create', null, jsonb_build_object('name', trim(p_name), 'segment', p_segment, 'recipients', picked, 'skipped', asked - picked));
  return jsonb_build_object('id', cid, 'recipients', picked, 'skipped', asked - picked);
end $$;

create or replace function public.crm_mark_sent(p_campaign uuid, p_username text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.campaign_recipients r
    set sent_at = coalesce(r.sent_at, now())
    where r.campaign_id = p_campaign
      and r.user_id = (select id from public.profiles where username = lower(trim(p_username)));
end $$;

-- Hasil: dari yang sudah dikirimi, berapa yang belanja dalam 14 hari sesudahnya.
create or replace function public.crm_campaigns()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'segment', c.segment, 'createdAt', c.created_at,
      'createdBy', (select username::text from public.profiles where id = c.created_by),
      'recipients', coalesce(s.recipients, 0), 'sent', coalesce(s.sent, 0),
      'returned', coalesce(s.returned, 0), 'revenueAfter', coalesce(s.revenue, 0)
    ) order by c.created_at desc)
    from public.campaigns c
    left join (
      select r.campaign_id,
             count(*) as recipients,
             count(r.sent_at) as sent,
             count(*) filter (where r.sent_at is not null and exists (
               select 1 from public.transactions t where t.user_id = r.user_id and t.created_at > r.sent_at and t.created_at <= r.sent_at + interval '14 days')) as returned,
             coalesce(sum((select sum(t.amount_rp) from public.transactions t
               where r.sent_at is not null and t.user_id = r.user_id and t.created_at > r.sent_at and t.created_at <= r.sent_at + interval '14 days')), 0) as revenue
      from public.campaign_recipients r group by r.campaign_id
    ) s on s.campaign_id = c.id), '[]'::jsonb);
end $$;

create or replace function public.crm_campaign(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.campaigns;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  c := (select x from public.campaigns x where x.id = p_id);
  if c.id is null then raise exception 'campaign not found'; end if;
  return jsonb_build_object(
    'id', c.id, 'name', c.name, 'message', c.message, 'segment', c.segment, 'createdAt', c.created_at,
    'recipients', coalesce((select jsonb_agg(jsonb_build_object(
        'username', p.username::text, 'fullName', p.full_name, 'whatsapp', p.whatsapp, 'sentAt', r.sent_at,
        'returned', r.sent_at is not null and exists (select 1 from public.transactions t where t.user_id = r.user_id and t.created_at > r.sent_at and t.created_at <= r.sent_at + interval '14 days'),
        'revenueAfter', case when r.sent_at is null then 0 else coalesce((select sum(t.amount_rp) from public.transactions t where t.user_id = r.user_id and t.created_at > r.sent_at and t.created_at <= r.sent_at + interval '14 days'), 0) end
      ) order by r.sent_at nulls first, p.full_name)
      from public.campaign_recipients r join public.profiles p on p.id = r.user_id
      where r.campaign_id = c.id), '[]'::jsonb)
  );
end $$;

create or replace function public.crm_audit(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'admin', a.admin_name, 'action', a.action, 'target', a.target_name, 'details', a.details, 'createdAt', a.created_at
    ) order by a.created_at desc)
    from (select * from public.audit_log order by created_at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) a), '[]'::jsonb);
end $$;

revoke execute on function public.crm_create_campaign(text, text, text, text[]) from public, anon;
revoke execute on function public.crm_mark_sent(uuid, text) from public, anon;
revoke execute on function public.crm_campaigns() from public, anon;
revoke execute on function public.crm_campaign(uuid) from public, anon;
revoke execute on function public.crm_audit(integer) from public, anon;
grant execute on function public.crm_create_campaign(text, text, text, text[]) to authenticated;
grant execute on function public.crm_mark_sent(uuid, text) to authenticated;
grant execute on function public.crm_campaigns() to authenticated;
grant execute on function public.crm_campaign(uuid) to authenticated;
grant execute on function public.crm_audit(integer) to authenticated;

-- ---------------------------------------------------------------- biaya reward (untuk ekonomi reward)
create or replace function public.crm_set_reward_cost(p_reward uuid, p_cost integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_cost is not null and p_cost < 0 then raise exception 'invalid cost'; end if;
  update public.rewards set unit_cost = p_cost where id = p_reward;
  if not found then raise exception 'reward not found'; end if;
  perform public.write_audit('reward.cost', null, jsonb_build_object('reward', p_reward, 'cost', p_cost));
end $$;
revoke execute on function public.crm_set_reward_cost(uuid, integer) from public, anon;
grant execute on function public.crm_set_reward_cost(uuid, integer) to authenticated;

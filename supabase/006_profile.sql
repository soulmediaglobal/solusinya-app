-- Tahap 7: profil lengkap, foto, akun sosial, hapus akun

alter table public.profiles
  add column birthday date,
  add column avatar text,
  add constraint avatar_size check (avatar is null or length(avatar) < 80000),
  add constraint birthday_range check (birthday is null or (birthday >= date '1900-01-01' and birthday <= current_date));

-- Pengguna boleh mengubah nama, username, WhatsApp, dan foto. Ulang tahun hanya lewat set_birthday (sekali saja).
revoke update on public.profiles from authenticated;
grant update (full_name, username, whatsapp, avatar) on public.profiles to authenticated;

create or replace function public.set_birthday(p_date date)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_date is null or p_date < date '1900-01-01' or p_date > current_date then raise exception 'invalid birthday'; end if;
  update public.profiles set birthday = p_date where id = uid and birthday is null;
  if not found then raise exception 'birthday already set'; end if;
end $$;
revoke execute on function public.set_birthday(date) from public, anon;
grant execute on function public.set_birthday(date) to authenticated;

create or replace function public.profile_complete(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select whatsapp is not null and whatsapp <> '' and birthday is not null from public.profiles where id = p_user), false);
$$;
revoke execute on function public.profile_complete(uuid) from public, anon;
grant execute on function public.profile_complete(uuid) to authenticated;

create table public.social_accounts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('discord','instagram','tiktok','telegram','facebook')),
  handle text not null check (length(handle) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (user_id, platform)
);
alter table public.social_accounts enable row level security;
create policy "own socials read" on public.social_accounts for select using (auth.uid() = user_id);
create policy "own socials insert" on public.social_accounts for insert with check (auth.uid() = user_id);
create policy "own socials update" on public.social_accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own socials delete" on public.social_accounts for delete using (auth.uid() = user_id);
create policy "admin reads socials" on public.social_accounts for select using (public.is_admin());

-- Reward hanya bisa ditukar/dipakai kalau profil lengkap (WhatsApp + ulang tahun).
create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.rewards; bal integer; vid uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not public.profile_complete(uid) then raise exception 'profile incomplete'; end if;
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

create or replace function public.activate_voucher(p_voucher_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); v public.vouchers; c text; i integer;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not public.profile_complete(uid) then raise exception 'profile incomplete'; end if;
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

-- Hapus akun sendiri (data member ikut terhapus lewat cascade).
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = uid;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- XP sekarang termasuk bonus profil lengkap (+50), Discord (+30), dan akun sosial lain (+10 per akun).
create or replace view public.member_xp with (security_invoker = true) as
select p.id as user_id,
  (
    coalesce((select sum(l.delta) from public.ledger l where l.user_id = p.id and l.kind = 'beans' and l.delta > 0), 0)
    + 10 * (select count(*) from public.transactions t where t.user_id = p.id)
    + 100 * (coalesce((select sum(l.delta) from public.ledger l where l.user_id = p.id and l.kind = 'stamp'), 0)
             / (select value from public.loyalty_config where key = 'stamps_per_card'))
    + case when p.whatsapp is not null and p.whatsapp <> '' and p.birthday is not null then 50 else 0 end
    + case when exists (select 1 from public.social_accounts s where s.user_id = p.id and s.platform = 'discord') then 30 else 0 end
    + 10 * (select count(*) from public.social_accounts s where s.user_id = p.id and s.platform <> 'discord')
  )::int as xp
from public.profiles p;

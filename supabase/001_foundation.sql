-- Solu Club: schema fondasi (Section A)
create extension if not exists citext;

create table public.outlets (
  code text primary key,
  name text not null
);
insert into public.outlets (code, name) values
  ('DRA','Dramaga'), ('JAT','Jatinangor'), ('PAM','Pamulang'), ('REN','Bali');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_id text not null unique,
  username citext not null unique,
  full_name text not null,
  whatsapp text,
  outlet_code text not null references public.outlets(code),
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9._]{3,20}$')
);

create or replace function public.generate_member_id(p_outlet text)
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  suffix text; candidate text; i int;
begin
  loop
    suffix := '';
    for i in 1..6 loop
      suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := 'SK-' || p_outlet || '-' || suffix;
    exit when not exists (select 1 from public.profiles where member_id = candidate);
  end loop;
  return candidate;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := new.raw_user_meta_data;
begin
  insert into public.profiles (id, member_id, username, full_name, whatsapp, outlet_code)
  values (
    new.id,
    public.generate_member_id(m->>'outlet_code'),
    lower(m->>'username'),
    m->>'full_name',
    nullif(m->>'whatsapp',''),
    m->>'outlet_code'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(p_username text)
returns boolean language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where username = lower(p_username));
$$;

create or replace function public.email_for_username(p_username text)
returns text language sql security definer set search_path = public, auth stable as $$
  select u.email from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = lower(p_username);
$$;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.email_for_username(text) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.outlets enable row level security;

create policy "outlets readable" on public.outlets for select using (true);
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (full_name, whatsapp) on public.profiles to authenticated;

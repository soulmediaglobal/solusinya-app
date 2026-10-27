-- Tahap 7: dashboard CRM (khusus admin)
-- Satu fungsi membaca seluruh data ringkasan. Hanya admin (profiles.is_admin) yang bisa menjalankannya.

create or replace function public.crm_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  since timestamptz;
  prev_since timestamptz;
  result jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_days is null or p_days < 1 or p_days > 365 then raise exception 'range must be 1-365 days'; end if;

  since := date_trunc('day', now()) - make_interval(days => p_days - 1);
  prev_since := since - make_interval(days => p_days);

  result := jsonb_build_object(
    'days', p_days,
    'generated_at', now(),

    'members', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'new_in_period', (select count(*) from public.profiles where created_at >= since),
      'active_in_period', (select count(distinct user_id) from public.transactions where created_at >= since),
      'dormant_30d', (select count(*) from (
          select user_id from public.transactions group by user_id having max(created_at) < now() - interval '30 days'
        ) d),
      'never_visited', (select count(*) from public.profiles p where not exists (select 1 from public.transactions t where t.user_id = p.id)),
      'unverified', (select count(*) from public.profiles p join auth.users u on u.id = p.id where u.email_confirmed_at is null),
      'signups', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(g.d, 'YYYY-MM-DD'), 'n', coalesce(c.n, 0)) order by g.d)
        from generate_series(since::date, current_date, interval '1 day') as g(d)
        left join (select created_at::date as d, count(*) as n from public.profiles where created_at >= since group by 1) c on c.d = g.d::date), '[]'::jsonb)
    ),

    'sales', jsonb_build_object(
      'revenue', (select coalesce(sum(amount_rp), 0) from public.transactions where created_at >= since),
      'visits', (select count(*) from public.transactions where created_at >= since),
      'avg_ticket', (select coalesce(round(avg(amount_rp)), 0) from public.transactions where created_at >= since),
      'prev_revenue', (select coalesce(sum(amount_rp), 0) from public.transactions where created_at >= prev_since and created_at < since),
      'prev_visits', (select count(*) from public.transactions where created_at >= prev_since and created_at < since),
      'by_outlet', coalesce((select jsonb_agg(jsonb_build_object(
          'code', o.code, 'name', o.name,
          'revenue', coalesce(s.revenue, 0), 'visits', coalesce(s.visits, 0), 'members', coalesce(s.members, 0)
        ) order by coalesce(s.revenue, 0) desc)
        from public.outlets o
        left join (select outlet_code, sum(amount_rp) as revenue, count(*) as visits, count(distinct user_id) as members
                   from public.transactions where created_at >= since group by outlet_code) s on s.outlet_code = o.code), '[]'::jsonb),
      'daily', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(g.d, 'YYYY-MM-DD'), 'revenue', coalesce(c.revenue, 0), 'visits', coalesce(c.visits, 0)) order by g.d)
        from generate_series(since::date, current_date, interval '1 day') as g(d)
        left join (select created_at::date as d, sum(amount_rp) as revenue, count(*) as visits from public.transactions where created_at >= since group by 1) c on c.d = g.d::date), '[]'::jsonb)
    ),

    'segments', jsonb_build_object(
      'levels', coalesce((select jsonb_agg(jsonb_build_object('level', l.level, 'name', l.name, 'members', coalesce(c.n, 0)) order by l.level)
        from public.levels l
        left join (
          select lv.level, count(*) as n
          from public.member_xp x
          join lateral (select level from public.levels where min_xp <= x.xp order by min_xp desc limit 1) lv on true
          group by lv.level
        ) c on c.level = l.level), '[]'::jsonb),
      'top_spenders', coalesce((select jsonb_agg(t order by t.total desc) from (
          select p.username::text as username, p.full_name, p.outlet_code,
                 sum(tx.amount_rp) as total, count(*) as visits, max(tx.created_at) as last_visit
          from public.transactions tx join public.profiles p on p.id = tx.user_id
          group by p.id order by sum(tx.amount_rp) desc limit 10
        ) t), '[]'::jsonb),
      'at_risk', coalesce((select jsonb_agg(t order by t.total desc) from (
          select p.username::text as username, p.full_name, p.whatsapp,
                 sum(tx.amount_rp) as total, count(*) as visits, max(tx.created_at) as last_visit,
                 (current_date - max(tx.created_at)::date) as days_since
          from public.transactions tx join public.profiles p on p.id = tx.user_id
          group by p.id having max(tx.created_at) < now() - interval '30 days'
          order by sum(tx.amount_rp) desc limit 15
        ) t), '[]'::jsonb),
      'birthdays', coalesce((select jsonb_agg(t order by t.day) from (
          select p.username::text as username, p.full_name, p.whatsapp, extract(day from p.birthday)::int as day
          from public.profiles p
          where p.birthday is not null and extract(month from p.birthday) = extract(month from current_date)
          limit 30
        ) t), '[]'::jsonb)
    ),

    'rewards', jsonb_build_object(
      'available', (select count(*) from public.vouchers where status = 'available' and expires_at > now()),
      'active', (select count(*) from public.vouchers where status = 'active' and expires_at > now()),
      'used', (select count(*) from public.vouchers where status = 'used'),
      'expired', (select count(*) from public.vouchers where status in ('available', 'active') and expires_at <= now()),
      'issued_in_period', (select count(*) from public.vouchers where created_at >= since),
      'used_in_period', (select count(*) from public.vouchers where status = 'used' and used_at >= since),
      'by_source', jsonb_build_object(
        'stamp', (select count(*) from public.vouchers where source = 'stamp'),
        'beans', (select count(*) from public.vouchers where source = 'beans')
      ),
      'by_reward', coalesce((select jsonb_agg(t order by t.issued desc) from (
          select r.name,
                 count(v.id) as issued,
                 count(v.id) filter (where v.status = 'used') as used,
                 count(v.id) filter (where v.status in ('available', 'active') and v.expires_at <= now()) as expired
          from public.rewards r left join public.vouchers v on v.reward_id = r.id
          group by r.id, r.name
        ) t), '[]'::jsonb)
    )
  );

  return result;
end $$;

revoke execute on function public.crm_dashboard(integer) from public, anon;
grant execute on function public.crm_dashboard(integer) to authenticated;

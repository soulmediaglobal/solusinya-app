-- Tahap 7b: insight lanjutan dan detail member untuk CRM (khusus admin)
-- Tiga fungsi: crm_insights (pola perilaku), crm_members (daftar + cari), crm_member (detail satu member).
-- Zona waktu analisis: Asia/Jakarta.

create or replace function public.crm_insights(p_days integer default 90)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  since timestamptz;
  cur_month timestamp;
  per_card integer;
  cohorts_json jsonb;
  result jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_days is null or p_days < 1 or p_days > 365 then raise exception 'range must be 1-365 days'; end if;

  since := date_trunc('day', now()) - make_interval(days => p_days - 1);
  per_card := (select value from public.loyalty_config where key = 'stamps_per_card');
  cur_month := date_trunc('month', now() at time zone 'Asia/Jakarta');

  -- Retensi per bulan daftar: berapa member dari tiap kelompok yang belanja di bulan ke-0, 1, 2, ...
  cohorts_json := (
    with co as (
      select p.id, date_trunc('month', p.created_at at time zone 'Asia/Jakarta') as m
      from public.profiles p
      where p.created_at >= (cur_month - interval '5 months') at time zone 'Asia/Jakarta'
    ),
    act as (
      select distinct user_id, date_trunc('month', created_at at time zone 'Asia/Jakarta') as m
      from public.transactions
    ),
    grid as (
      select co.m, k, count(distinct co.id) as size, count(distinct act.user_id) as n
      from co cross join generate_series(0, 5) as k
      left join act on act.user_id = co.id and act.m = co.m + make_interval(months => k)
      group by co.m, k
    )
    select coalesce(jsonb_agg(jsonb_build_object('month', to_char(g.m, 'YYYY-MM'), 'size', g.size, 'retained', g.arr) order by g.m), '[]'::jsonb)
    from (
      select m, max(size) as size,
             jsonb_agg(case when m + make_interval(months => k) > cur_month then null else n end order by k) as arr
      from grid group by m
    ) g
  );

  result := jsonb_build_object(
    'days', p_days,
    'generatedAt', now(),
    'cohorts', cohorts_json,

    'heatmap', coalesce((select jsonb_agg(jsonb_build_object('d', x.dow, 'h', x.hr, 'n', x.n))
      from (
        select extract(isodow from t.local)::int as dow, extract(hour from t.local)::int as hr, count(*) as n
        from (select created_at at time zone 'Asia/Jakarta' as local from public.transactions where created_at >= since) t
        group by 1, 2
      ) x), '[]'::jsonb),

    'funnel', jsonb_build_object(
      'registered', (select count(*) from public.profiles),
      'verified', (select count(*) from public.profiles p join auth.users u on u.id = p.id where u.email_confirmed_at is not null),
      'firstVisit', (select count(distinct user_id) from public.transactions),
      'repeat', (select count(*) from (select user_id from public.transactions group by user_id having count(*) >= 2) r),
      'completedCard', (select count(*) from (select user_id from public.transactions group by user_id having count(*) >= per_card) r)
    ),

    'ticketHist', coalesce((select jsonb_agg(jsonb_build_object('label', b.label, 'n', b.n) order by b.ord)
      from (
        select o.ord, o.label, count(t.id) as n
        from (values (1, '< 25rb', 0, 25000), (2, '25-50rb', 25000, 50000), (3, '50-75rb', 50000, 75000), (4, '75-100rb', 75000, 100000),
                     (5, '100-150rb', 100000, 150000), (6, '150-200rb', 150000, 200000), (7, '200rb+', 200000, 2147483647)) as o(ord, label, lo, hi)
        left join public.transactions t on t.created_at >= since and t.amount_rp >= o.lo and t.amount_rp < o.hi
        group by o.ord, o.label
      ) b), '[]'::jsonb),

    'visitsDist', coalesce((select jsonb_agg(jsonb_build_object('label', b.label, 'n', b.n) order by b.ord)
      from (
        select o.ord, o.label, count(v.user_id) as n
        from (values (1, '1 visit', 1, 2), (2, '2-3', 2, 4), (3, '4-6', 4, 7), (4, '7-10', 7, 11), (5, '11-20', 11, 21), (6, '21+', 21, 2147483647)) as o(ord, label, lo, hi)
        left join (select user_id, count(*) as c from public.transactions group by user_id) v on v.c >= o.lo and v.c < o.hi
        group by o.ord, o.label
      ) b), '[]'::jsonb),

    'outletRadar', coalesce((select jsonb_agg(jsonb_build_object(
        'code', x.code, 'name', x.name, 'revenue', x.revenue, 'visits', x.visits, 'avgTicket', x.avg_ticket,
        'members', x.members, 'repeatMembers', x.repeat_members, 'newMembers', x.new_members) order by x.code)
      from (
        select o.code, o.name,
               coalesce(sum(t.amount_rp), 0) as revenue,
               count(t.id) as visits,
               coalesce(round(avg(t.amount_rp)), 0) as avg_ticket,
               count(distinct t.user_id) as members,
               (select count(*) from (select user_id from public.transactions
                  where outlet_code = o.code and created_at >= since group by user_id having count(*) >= 2) r) as repeat_members,
               (select count(*) from public.profiles p where p.outlet_code = o.code and p.created_at >= since) as new_members
        from public.outlets o
        left join public.transactions t on t.outlet_code = o.code and t.created_at >= since
        group by o.code, o.name
      ) x), '[]'::jsonb),

    -- Berapa member yang belanja di outlet A dan juga di outlet B (diagonal = member di outlet itu)
    'crossover', coalesce((select jsonb_agg(jsonb_build_object('a', x.a, 'b', x.b, 'n', x.n))
      from (
        select a.outlet_code as a, b.outlet_code as b, count(*) as n
        from (select distinct user_id, outlet_code from public.transactions) a
        join (select distinct user_id, outlet_code from public.transactions) b on a.user_id = b.user_id
        group by 1, 2
      ) x), '[]'::jsonb),

    'scatter', coalesce((select jsonb_agg(jsonb_build_object(
        'username', s.username, 'visits', s.visits, 'total', s.total, 'daysSince', s.days_since, 'level', s.level))
      from (
        select p.username::text as username, count(*)::int as visits, sum(tx.amount_rp)::bigint as total,
               (current_date - max(tx.created_at)::date)::int as days_since,
               coalesce((select l.level from public.levels l where l.min_xp <= coalesce(mx.xp, 0) order by l.min_xp desc limit 1), 1) as level
        from public.transactions tx
        join public.profiles p on p.id = tx.user_id
        left join public.member_xp mx on mx.user_id = p.id
        group by p.id, mx.xp
        order by sum(tx.amount_rp) desc
        limit 200
      ) s), '[]'::jsonb)
  );

  return result;
end $$;

revoke execute on function public.crm_insights(integer) from public, anon;
grant execute on function public.crm_insights(integer) to authenticated;


create or replace function public.crm_members(p_q text default '', p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  q text := trim(coalesce(p_q, ''));
  result jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then p_limit := 100; end if;

  result := (
    select coalesce(jsonb_agg(m.j order by m.total desc, m.created_at desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
               'username', p.username::text, 'fullName', p.full_name, 'memberId', p.member_id, 'email', u.email,
               'homeOutlet', p.outlet_code, 'createdAt', p.created_at,
               'level', coalesce(lv.name, 'Green Bean'), 'xp', coalesce(x.xp, 0),
               'visits', coalesce(s.visits, 0), 'total', coalesce(s.total, 0), 'lastVisit', s.last_visit, 'outlets', coalesce(s.outlets, 0)
             ) as j,
             coalesce(s.total, 0) as total, p.created_at
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.member_xp x on x.user_id = p.id
      left join lateral (select name from public.levels where min_xp <= coalesce(x.xp, 0) order by min_xp desc limit 1) lv on true
      left join (select user_id, count(*) as visits, sum(amount_rp) as total, max(created_at) as last_visit, count(distinct outlet_code) as outlets
                 from public.transactions group by user_id) s on s.user_id = p.id
      where q = ''
         or p.username::text ilike '%' || q || '%'
         or p.full_name ilike '%' || q || '%'
         or u.email ilike '%' || q || '%'
         or p.member_id ilike '%' || q || '%'
      order by coalesce(s.total, 0) desc, p.created_at desc
      limit p_limit
    ) m
  );
  return result;
end $$;

revoke execute on function public.crm_members(text, integer) from public, anon;
grant execute on function public.crm_members(text, integer) to authenticated;


create or replace function public.crm_member(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  uid uuid;
  per_card integer;
  my_total bigint;
  prof jsonb;
  standing jsonb;
  stats jsonb;
  metrics jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  uid := (select id from public.profiles where username = lower(trim(p_username)));
  if uid is null then raise exception 'member not found'; end if;
  per_card := (select value from public.loyalty_config where key = 'stamps_per_card');
  my_total := (select coalesce(sum(amount_rp), 0) from public.transactions where user_id = uid);

  prof := (
    select jsonb_build_object(
      'username', p.username::text, 'fullName', p.full_name, 'memberId', p.member_id, 'email', u.email,
      'whatsapp', p.whatsapp, 'homeOutlet', p.outlet_code, 'createdAt', p.created_at, 'birthday', p.birthday,
      'lastSignIn', u.last_sign_in_at, 'emailConfirmed', u.email_confirmed_at is not null, 'isAdmin', p.is_admin,
      'profileComplete', (p.whatsapp is not null and p.whatsapp <> '' and p.birthday is not null),
      'socials', coalesce((select jsonb_agg(jsonb_build_object('platform', s.platform, 'handle', s.handle) order by s.platform)
                           from public.social_accounts s where s.user_id = p.id), '[]'::jsonb)
    )
    from public.profiles p join auth.users u on u.id = p.id
    where p.id = uid
  );

  standing := (
    select jsonb_build_object(
      'xp', coalesce(x.xp, 0),
      'level', coalesce(lv.level, 1), 'levelName', coalesce(lv.name, 'Green Bean'),
      'nextLevelName', nx.name, 'nextLevelXp', nx.min_xp,
      'beans', coalesce(b.beans, 0), 'stamps', coalesce(b.stamps, 0), 'lifetimeBeans', coalesce(b.lifetime_beans, 0),
      'cardsCompleted', coalesce(b.stamps, 0) / greatest(per_card, 1),
      'stampsOnCard', coalesce(b.stamps, 0) % greatest(per_card, 1), 'stampsPerCard', per_card
    )
    from (select 1) one
    left join public.member_xp x on x.user_id = uid
    left join public.member_balances b on b.user_id = uid
    left join lateral (select level, name from public.levels where min_xp <= coalesce(x.xp, 0) order by min_xp desc limit 1) lv on true
    left join lateral (select name, min_xp from public.levels where min_xp > coalesce(x.xp, 0) order by min_xp limit 1) nx on true
  );

  stats := (
    select jsonb_build_object(
      'visits', count(*), 'total', coalesce(sum(amount_rp), 0), 'avgTicket', coalesce(round(avg(amount_rp)), 0), 'maxTicket', coalesce(max(amount_rp), 0),
      'firstVisit', min(created_at), 'lastVisit', max(created_at),
      'daysSinceLast', (current_date - max(created_at)::date),
      'avgGapDays', case when count(*) > 1 then round(((max(created_at)::date - min(created_at)::date)::numeric) / (count(*) - 1), 1) else null end,
      'rank', (select count(*) + 1 from (select user_id from public.transactions group by user_id having sum(amount_rp) > my_total) r),
      'spenders', (select count(distinct user_id) from public.transactions)
    )
    from public.transactions where user_id = uid
  );

  metrics := (
    with base as (
      select p.id,
             coalesce(s.visits, 0) as frequency,
             coalesce(s.total, 0) as monetary,
             case when s.last_visit is null then 0 else greatest(0, 100 - (current_date - s.last_visit::date) * 100.0 / 90) end as recency,
             coalesce(s.outlets, 0) as variety,
             coalesce(v.used, 0) as loyalty,
             (case when p.whatsapp is not null and p.whatsapp <> '' and p.birthday is not null then 1 else 0 end) + coalesce(sc.n, 0) as engagement
      from public.profiles p
      left join (select user_id, count(*) as visits, sum(amount_rp) as total, max(created_at) as last_visit, count(distinct outlet_code) as outlets
                 from public.transactions group by user_id) s on s.user_id = p.id
      left join (select user_id, count(*) as used from public.vouchers where status = 'used' group by user_id) v on v.user_id = p.id
      left join (select user_id, count(*) as n from public.social_accounts group by user_id) sc on sc.user_id = p.id
    )
    select jsonb_build_object(
      'member', (select to_jsonb(b) - 'id' from base b where b.id = uid),
      'avg', (select jsonb_build_object('frequency', round(avg(frequency), 1), 'monetary', round(avg(monetary)), 'recency', round(avg(recency), 1),
                                        'variety', round(avg(variety), 2), 'loyalty', round(avg(loyalty), 2), 'engagement', round(avg(engagement), 2)) from base),
      'max', (select jsonb_build_object('frequency', max(frequency), 'monetary', max(monetary), 'recency', 100,
                                        'variety', greatest(max(variety), 4), 'loyalty', max(loyalty), 'engagement', max(engagement)) from base)
    )
  );

  return jsonb_build_object(
    'profile', prof,
    'standing', standing,
    'stats', stats,
    'radar', metrics,

    'byOutlet', coalesce((select jsonb_agg(jsonb_build_object('code', o.code, 'name', o.name, 'visits', coalesce(s.visits, 0), 'revenue', coalesce(s.revenue, 0), 'lastVisit', s.last_visit) order by o.code)
      from public.outlets o
      left join (select outlet_code, count(*) as visits, sum(amount_rp) as revenue, max(created_at) as last_visit
                 from public.transactions where user_id = uid group by outlet_code) s on s.outlet_code = o.code), '[]'::jsonb),

    'monthly', coalesce((select jsonb_agg(jsonb_build_object('m', to_char(g.m, 'YYYY-MM'), 'revenue', coalesce(c.revenue, 0), 'visits', coalesce(c.visits, 0)) order by g.m)
      from generate_series(date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '11 months',
                           date_trunc('month', now() at time zone 'Asia/Jakarta'), interval '1 month') as g(m)
      left join (select date_trunc('month', created_at at time zone 'Asia/Jakarta') as m, sum(amount_rp) as revenue, count(*) as visits
                 from public.transactions where user_id = uid group by 1) c on c.m = g.m), '[]'::jsonb),

    'heatmap', coalesce((select jsonb_agg(jsonb_build_object('d', x.dow, 'h', x.hr, 'n', x.n))
      from (
        select extract(isodow from t.local)::int as dow, extract(hour from t.local)::int as hr, count(*) as n
        from (select created_at at time zone 'Asia/Jakarta' as local from public.transactions where user_id = uid) t
        group by 1, 2
      ) x), '[]'::jsonb),

    'vouchers', coalesce((select jsonb_agg(jsonb_build_object(
        'reward', r.name, 'source', v.source, 'detail', v.source_detail,
        'status', case when v.status = 'used' then 'used' when v.expires_at <= now() then 'expired' else v.status end,
        'createdAt', v.created_at, 'expiresAt', v.expires_at, 'usedAt', v.used_at, 'usedOutlet', v.used_outlet) order by v.created_at desc)
      from (select * from public.vouchers where user_id = uid order by created_at desc limit 40) v
      join public.rewards r on r.id = v.reward_id), '[]'::jsonb),

    'recent', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'amount', t.amount_rp, 'outlet', t.outlet_code, 'createdAt', t.created_at) order by t.created_at desc)
      from (select * from public.transactions where user_id = uid order by created_at desc limit 20) t), '[]'::jsonb)
  );
end $$;

revoke execute on function public.crm_member(text) from public, anon;
grant execute on function public.crm_member(text) to authenticated;

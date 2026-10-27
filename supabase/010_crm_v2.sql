-- Tahap 7d: analisis CRM lanjutan (khusus admin)
--   crm_overview(from, to, outlet)  : KPI + perbandingan periode, forecast, alert, ekonomi reward, menu, sumber daftar
--   crm_segments(outlet)            : satu baris per member dengan RFM, segmen, risiko churn, prediksi kunjungan, CLV
--   crm_member_extra(username)      : timeline, menu favorit, persentil, member mirip, catatan, label
-- Semua tanggal dihitung dalam zona Asia/Jakarta. Skor risiko churn dan CLV adalah heuristik sederhana, bukan model statistik.

create or replace function public.crm_overview(p_from date, p_to date, p_outlet text default null)
returns jsonb language plpgsql security definer set search_path = public, auth stable as $$
declare
  tz constant text := 'Asia/Jakarta';
  d_from date; d_to date; span integer;
  t_from timestamptz; t_to timestamptz; pt_from timestamptz;
  today date := (now() at time zone 'Asia/Jakarta')::date;
  w_from timestamptz; w_prev timestamptz;
  month_start date; elapsed integer; dim integer;
  mtd bigint; result jsonb; alerts jsonb := '[]'::jsonb; n integer;
  outlet text := nullif(trim(coalesce(p_outlet, '')), '');
  md0 text := to_char((now() at time zone 'Asia/Jakarta')::date, 'MMDD');
  md7 text := to_char((now() at time zone 'Asia/Jakarta')::date + 7, 'MMDD');
  md30 text := to_char((now() at time zone 'Asia/Jakarta')::date + 30, 'MMDD');
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  d_to := least(coalesce(p_to, today), today);
  d_from := coalesce(p_from, d_to - 29);
  if d_from > d_to then raise exception 'invalid range'; end if;
  span := d_to - d_from + 1;
  if span > 366 then raise exception 'range too long'; end if;
  t_from := (d_from::timestamp) at time zone tz;
  t_to := ((d_to + 1)::timestamp) at time zone tz;
  pt_from := ((d_from - span)::timestamp) at time zone tz;
  w_from := ((today - 6)::timestamp) at time zone tz;
  w_prev := ((today - 13)::timestamp) at time zone tz;
  month_start := date_trunc('month', today)::date;
  elapsed := today - month_start + 1;
  dim := extract(day from (date_trunc('month', today) + interval '1 month - 1 day'))::int;
  mtd := (select coalesce(sum(amount_rp), 0) from public.transactions
          where created_at >= (month_start::timestamp) at time zone tz and (outlet is null or outlet_code = outlet));

  -- alert
  n := (select count(*) from public.outlets o where (outlet is null or o.code = outlet)
        and exists (select 1 from public.transactions t where t.outlet_code = o.code)
        and not exists (select 1 from public.transactions t where t.outlet_code = o.code and t.created_at >= now() - interval '3 days'));
  if n > 0 then alerts := alerts || jsonb_build_object('level', 'warn', 'key', 'quiet_outlet', 'count', n,
      'text', n || ' outlet tanpa transaksi 3 hari terakhir'); end if;
  n := (select count(*) from public.vouchers where status in ('available', 'active') and expires_at > now() and expires_at <= now() + interval '7 days');
  if n > 0 then alerts := alerts || jsonb_build_object('level', 'info', 'key', 'vouchers_expiring', 'count', n,
      'text', n || ' voucher akan kedaluwarsa dalam 7 hari'); end if;
  n := (select count(*) from public.profiles p where p.birthday is not null
        and ((to_char(p.birthday, 'MMDD') >= md0 and to_char(p.birthday, 'MMDD') <= md7)
          or (md7 < md0 and (to_char(p.birthday, 'MMDD') >= md0 or to_char(p.birthday, 'MMDD') <= md7))));
  if n > 0 then alerts := alerts || jsonb_build_object('level', 'info', 'key', 'birthdays', 'count', n,
      'text', n || ' member ulang tahun dalam 7 hari'); end if;
  n := (select count(*) from public.crm_notes where not done and due_on is not null and due_on <= today);
  if n > 0 then alerts := alerts || jsonb_build_object('level', 'warn', 'key', 'followups_due', 'count', n,
      'text', n || ' tindak lanjut jatuh tempo'); end if;
  n := (select count(*) from (
          select user_id from public.transactions group by user_id
          having count(*) >= 3
             and (current_date - max(created_at)::date) > 2 * greatest(7, (max(created_at)::date - min(created_at)::date)::numeric / nullif(count(*) - 1, 0))
        ) x);
  if n > 0 then alerts := alerts || jsonb_build_object('level', 'warn', 'key', 'overdue_regulars', 'count', n,
      'text', n || ' member rutin terlambat datang lebih dari 2x kebiasaannya'); end if;
  if (select coalesce(sum(amount_rp), 0) from public.transactions where created_at >= w_prev and created_at < w_from and (outlet is null or outlet_code = outlet)) > 0
     and (select coalesce(sum(amount_rp), 0) from public.transactions where created_at >= w_from and (outlet is null or outlet_code = outlet))
         < 0.8 * (select sum(amount_rp) from public.transactions where created_at >= w_prev and created_at < w_from and (outlet is null or outlet_code = outlet)) then
    alerts := alerts || jsonb_build_object('level', 'bad', 'key', 'revenue_drop', 'count', 1,
      'text', 'Omzet 7 hari terakhir turun lebih dari 20% dibanding 7 hari sebelumnya');
  end if;

  result := jsonb_build_object(
    'from', d_from, 'to', d_to, 'days', span, 'outlet', outlet, 'generatedAt', now(),

    'kpi', jsonb_build_object(
      'revenue', (select coalesce(sum(amount_rp), 0) from public.transactions where created_at >= t_from and created_at < t_to and (outlet is null or outlet_code = outlet)),
      'visits', (select count(*) from public.transactions where created_at >= t_from and created_at < t_to and (outlet is null or outlet_code = outlet)),
      'activeMembers', (select count(distinct user_id) from public.transactions where created_at >= t_from and created_at < t_to and (outlet is null or outlet_code = outlet)),
      'avgTicket', (select coalesce(round(avg(amount_rp)), 0) from public.transactions where created_at >= t_from and created_at < t_to and (outlet is null or outlet_code = outlet)),
      'newMembers', (select count(*) from public.profiles where created_at >= t_from and created_at < t_to and (outlet is null or outlet_code = outlet)),
      'prevRevenue', (select coalesce(sum(amount_rp), 0) from public.transactions where created_at >= pt_from and created_at < t_from and (outlet is null or outlet_code = outlet)),
      'prevVisits', (select count(*) from public.transactions where created_at >= pt_from and created_at < t_from and (outlet is null or outlet_code = outlet)),
      'prevActiveMembers', (select count(distinct user_id) from public.transactions where created_at >= pt_from and created_at < t_from and (outlet is null or outlet_code = outlet)),
      'prevAvgTicket', (select coalesce(round(avg(amount_rp)), 0) from public.transactions where created_at >= pt_from and created_at < t_from and (outlet is null or outlet_code = outlet)),
      'prevNewMembers', (select count(*) from public.profiles where created_at >= pt_from and created_at < t_from and (outlet is null or outlet_code = outlet)),
      'totalMembers', (select count(*) from public.profiles where outlet is null or outlet_code = outlet),
      'repeatRate', (select coalesce(round(100.0 * count(*) filter (where c > 1) / nullif(count(*), 0)), 0) from (
          select count(*) as c from public.transactions where created_at >= t_from and created_at < t_to and (outlet is null or outlet_code = outlet) group by user_id) r)
    ),

    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(g.d, 'YYYY-MM-DD'), 'revenue', coalesce(c.revenue, 0), 'visits', coalesce(c.visits, 0),
          'prevRevenue', coalesce(pc.revenue, 0)) order by g.d)
        from generate_series(d_from, d_to, interval '1 day') as g(d)
        left join (select (created_at at time zone tz)::date as d, sum(amount_rp) as revenue, count(*) as visits
                   from public.transactions where created_at >= t_from and created_at < t_to and (outlet is null or outlet_code = outlet) group by 1) c on c.d = g.d::date
        left join (select (created_at at time zone tz)::date as d, sum(amount_rp) as revenue
                   from public.transactions where created_at >= pt_from and created_at < t_from and (outlet is null or outlet_code = outlet) group by 1) pc on pc.d = (g.d::date - span)
      ), '[]'::jsonb),

    'byOutlet', coalesce((select jsonb_agg(jsonb_build_object('code', o.code, 'name', o.name,
          'revenue', coalesce(s.revenue, 0), 'visits', coalesce(s.visits, 0), 'prevRevenue', coalesce(ps.revenue, 0)) order by coalesce(s.revenue, 0) desc)
        from public.outlets o
        left join (select outlet_code, sum(amount_rp) as revenue, count(*) as visits from public.transactions where created_at >= t_from and created_at < t_to group by 1) s on s.outlet_code = o.code
        left join (select outlet_code, sum(amount_rp) as revenue from public.transactions where created_at >= pt_from and created_at < t_from group by 1) ps on ps.outlet_code = o.code
      ), '[]'::jsonb),

    'week', jsonb_build_object(
      'revenue', (select coalesce(sum(amount_rp), 0) from public.transactions where created_at >= w_from and (outlet is null or outlet_code = outlet)),
      'prevRevenue', (select coalesce(sum(amount_rp), 0) from public.transactions where created_at >= w_prev and created_at < w_from and (outlet is null or outlet_code = outlet)),
      'visits', (select count(*) from public.transactions where created_at >= w_from and (outlet is null or outlet_code = outlet)),
      'prevVisits', (select count(*) from public.transactions where created_at >= w_prev and created_at < w_from and (outlet is null or outlet_code = outlet))
    ),

    'forecast', jsonb_build_object(
      'monthToDate', mtd, 'daysElapsed', elapsed, 'daysInMonth', dim,
      'projected', round(mtd::numeric / elapsed * dim),
      'prevMonth', (select coalesce(sum(amount_rp), 0) from public.transactions
          where created_at >= (((month_start - interval '1 month')::date)::timestamp) at time zone tz
            and created_at < (month_start::timestamp) at time zone tz and (outlet is null or outlet_code = outlet))
    ),

    'alerts', alerts,

    'rewardEconomics', jsonb_build_object(
      'issued', (select count(*) from public.vouchers where created_at >= t_from and created_at < t_to),
      'used', (select count(*) from public.vouchers where status = 'used' and used_at >= t_from and used_at < t_to),
      'expired', (select count(*) from public.vouchers where status in ('available', 'active') and expires_at >= t_from and expires_at < t_to and expires_at <= now()),
      'costUsed', (select coalesce(sum(r.unit_cost), 0) from public.vouchers v join public.rewards r on r.id = v.reward_id where v.status = 'used' and v.used_at >= t_from and v.used_at < t_to),
      'costKnown', (select count(*) = 0 from public.rewards where active and unit_cost is null),
      'byReward', coalesce((select jsonb_agg(x order by x.used desc) from (
          select r.id, r.name, r.unit_cost as "unitCost",
                 count(v.id) filter (where v.created_at >= t_from and v.created_at < t_to) as issued,
                 count(v.id) filter (where v.status = 'used' and v.used_at >= t_from and v.used_at < t_to) as used
          from public.rewards r left join public.vouchers v on v.reward_id = r.id group by r.id, r.name, r.unit_cost) x), '[]'::jsonb),
      'bySource', jsonb_build_object(
          'stamp', (select count(*) from public.vouchers where source = 'stamp' and created_at >= t_from and created_at < t_to),
          'beans', (select count(*) from public.vouchers where source = 'beans' and created_at >= t_from and created_at < t_to),
          'gift', (select count(*) from public.vouchers where source = 'gift' and created_at >= t_from and created_at < t_to))
    ),

    'topMenu', coalesce((select jsonb_agg(x order by x.qty desc) from (
        select m.name, m.category, sum(ti.qty) as qty, count(distinct t.id) as orders
        from public.transaction_items ti
        join public.transactions t on t.id = ti.transaction_id
        join public.menu_items m on m.id = ti.menu_item_id
        where t.created_at >= t_from and t.created_at < t_to and (outlet is null or t.outlet_code = outlet)
        group by m.id, m.name, m.category order by sum(ti.qty) desc limit 10) x), '[]'::jsonb),
    'menuCoverage', (select coalesce(round(100.0 * count(*) filter (where exists (select 1 from public.transaction_items ti where ti.transaction_id = t.id)) / nullif(count(*), 0)), 0)
        from public.transactions t where t.created_at >= t_from and t.created_at < t_to and (outlet is null or t.outlet_code = outlet)),

    'signupSources', coalesce((select jsonb_agg(jsonb_build_object('source', coalesce(signup_source, 'unknown'), 'members', s.cnt) order by s.cnt desc) from (
        select signup_source, count(*) as cnt from public.profiles where outlet is null or outlet_code = outlet group by 1) s), '[]'::jsonb),
    'levels', coalesce((select jsonb_agg(jsonb_build_object('level', l.level, 'name', l.name, 'members', coalesce(c.cnt, 0)) order by l.level)
        from public.levels l
        left join (
          select lv.level, count(*) as cnt
          from public.member_xp x
          join public.profiles pr on pr.id = x.user_id
          join lateral (select level from public.levels where min_xp <= x.xp order by min_xp desc limit 1) lv on true
          where outlet is null or pr.outlet_code = outlet
          group by lv.level
        ) c on c.level = l.level), '[]'::jsonb),
    'birthdays', coalesce((select jsonb_agg(b order by b.sortkey) from (
        select p.username::text as username, p.full_name as "fullName", p.whatsapp, p.marketing_opt_in as "optIn",
               to_char(p.birthday, 'MM-DD') as md,
               ((to_char(p.birthday, 'MMDD') < md0)::int || to_char(p.birthday, 'MMDD')) as sortkey
        from public.profiles p
        where p.birthday is not null and (outlet is null or p.outlet_code = outlet)
          and ((to_char(p.birthday, 'MMDD') >= md0 and to_char(p.birthday, 'MMDD') <= md30)
            or (md30 < md0 and (to_char(p.birthday, 'MMDD') >= md0 or to_char(p.birthday, 'MMDD') <= md30)))
        limit 60) b), '[]'::jsonb),
    'optIn', jsonb_build_object(
      'yes', (select count(*) from public.profiles where marketing_opt_in and (outlet is null or outlet_code = outlet)),
      'total', (select count(*) from public.profiles where outlet is null or outlet_code = outlet))
  );
  return result;
end $$;

-- ---------------------------------------------------------------- segmen RFM
create or replace function public.crm_segments(p_outlet text default null)
returns jsonb language plpgsql security definer set search_path = public, auth stable as $$
declare outlet text := nullif(trim(coalesce(p_outlet, '')), ''); today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(row_to_json(z)::jsonb order by z.total desc) from (
    select y.*,
      case
        when y.visits = 0 then 'new'
        when y.r >= 4 and y.f >= 4 then 'champion'
        when y.f >= 4 and y.r >= 3 then 'loyal'
        when y.r <= 2 and y.f >= 3 then 'at_risk'
        when y.m >= 4 and y.f <= 3 then 'big_spender'
        when y.r >= 4 and y.f <= 2 then 'promising'
        when y.r <= 2 then 'hibernating'
        else 'attention'
      end as segment,
      case when y.visits = 0 then 0
           else least(100, round(100.0 * (y.days_since::numeric / greatest(7, coalesce(y.avg_gap, 30))) / 2.5))::int end as churn_risk,
      case when y.visits >= 3 and y.avg_gap is not null then (y.last_visit::date + round(y.avg_gap)::int) end as next_visit,
      case when y.visits = 0 then 0
           else round(y.avg_ticket * (y.visits::numeric / greatest(30, (y.last_visit::date - y.first_visit::date) + 1)) * 30 * 12) end as clv12
    from (
      select x.*,
        case when x.visits = 0 then 0 else 6 - ntile(5) over (partition by (x.visits > 0) order by x.days_since asc) end as r,
        case when x.visits = 0 then 0 else ntile(5) over (partition by (x.visits > 0) order by x.visits asc, x.total asc) end as f,
        case when x.visits = 0 then 0 else ntile(5) over (partition by (x.visits > 0) order by x.total asc) end as m
      from (
        select p.username::text as username, p.full_name, p.outlet_code, p.whatsapp, p.marketing_opt_in as opt_in, p.signup_source,
               coalesce(t.visits, 0) as visits, coalesce(t.total, 0) as total, coalesce(t.avg_ticket, 0) as avg_ticket,
               t.first_visit, t.last_visit,
               case when t.last_visit is null then null else today - (t.last_visit at time zone 'Asia/Jakarta')::date end as days_since,
               case when coalesce(t.visits, 0) >= 2 then ((t.last_visit::date - t.first_visit::date)::numeric / (t.visits - 1)) end as avg_gap,
               coalesce((select array_agg(c.tag order by c.tag) from public.crm_tags c where c.user_id = p.id), '{}'::text[]) as tags,
               (select count(*) from public.crm_notes n where n.user_id = p.id and not n.done and n.due_on is not null) as open_followups
        from public.profiles p
        left join (select user_id, count(*) as visits, sum(amount_rp) as total, round(avg(amount_rp)) as avg_ticket,
                          min(created_at) as first_visit, max(created_at) as last_visit
                   from public.transactions group by user_id) t on t.user_id = p.id
        where outlet is null or p.outlet_code = outlet
      ) x
    ) y
  ) z), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- tambahan detail member
create or replace function public.crm_member_extra(p_username text)
returns jsonb language plpgsql security definer set search_path = public, auth stable as $$
declare uid uuid; v_total bigint; v_visits integer; v_avg numeric; pct_total int; pct_visits int; members integer; last_t timestamptz; avg_gap numeric; first_t timestamptz;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  uid := (select id from public.profiles where username = lower(trim(p_username)));
  if uid is null then raise exception 'member not found'; end if;
  v_total := (select coalesce(sum(amount_rp), 0) from public.transactions where user_id = uid);
  v_visits := (select count(*) from public.transactions where user_id = uid);
  v_avg := (select coalesce(avg(amount_rp), 0) from public.transactions where user_id = uid);
  last_t := (select max(created_at) from public.transactions where user_id = uid);
  first_t := (select min(created_at) from public.transactions where user_id = uid);
  members := (select count(distinct user_id) from public.transactions);
  pct_total := (select coalesce(round(100.0 * count(*) filter (where s.total < v_total) / nullif(count(*), 0)), 0)
                from (select sum(amount_rp) as total from public.transactions group by user_id) s);
  pct_visits := (select coalesce(round(100.0 * count(*) filter (where s.c < v_visits) / nullif(count(*), 0)), 0)
                 from (select count(*) as c from public.transactions group by user_id) s);
  avg_gap := case when v_visits >= 2 then (last_t::date - first_t::date)::numeric / (v_visits - 1) end;

  return jsonb_build_object(
    'optIn', (select marketing_opt_in from public.profiles where id = uid),
    'signupSource', (select signup_source from public.profiles where id = uid),
    'percentile', jsonb_build_object('spend', pct_total, 'visits', pct_visits, 'members', members),
    'predictedNextVisit', case when v_visits >= 3 and avg_gap is not null then (last_t::date + round(avg_gap)::int) end,
    'avgGapDays', avg_gap,
    'clv12', case when v_visits = 0 then 0
                  else round(v_avg * (v_visits::numeric / greatest(30, (last_t::date - first_t::date) + 1)) * 30 * 12) end,
    'ticketTrend', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(created_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD'), 'amount', amount_rp) order by created_at)
        from (select created_at, amount_rp from public.transactions where user_id = uid order by created_at desc limit 20) x), '[]'::jsonb),
    'favoriteMenu', coalesce((select jsonb_agg(x order by x.qty desc) from (
        select m.name, m.category, sum(ti.qty) as qty, count(*) as orders, max(t.created_at) as last
        from public.transaction_items ti join public.transactions t on t.id = ti.transaction_id
        join public.menu_items m on m.id = ti.menu_item_id where t.user_id = uid
        group by m.id, m.name, m.category order by sum(ti.qty) desc limit 8) x), '[]'::jsonb),
    'timeline', coalesce((select jsonb_agg(e order by e.at desc) from (
        select * from (
          select t.created_at as at, 'visit' as kind, ('Belanja Rp ' || t.amount_rp || ' di ' || coalesce(o.name, t.outlet_code)) as text
            from public.transactions t left join public.outlets o on o.code = t.outlet_code where t.user_id = uid
          union all
          select v.created_at, 'voucher', 'Dapat voucher ' || r.name || ' (' || v.source || ')'
            from public.vouchers v join public.rewards r on r.id = v.reward_id where v.user_id = uid
          union all
          select v.used_at, 'redeem', 'Memakai voucher ' || r.name
            from public.vouchers v join public.rewards r on r.id = v.reward_id where v.user_id = uid and v.used_at is not null
          union all
          select n.created_at, case when n.due_on is null then 'note' else 'followup' end, n.body
            from public.crm_notes n where n.user_id = uid
          union all
          select p.created_at, 'signup', 'Bergabung di Solu Club'
            from public.profiles p where p.id = uid
        ) u order by u.at desc limit 60) e), '[]'::jsonb),
    'lookalikes', coalesce((select jsonb_agg(x) from (
        select p.username::text as username, p.full_name, s.total, s.visits
        from (select user_id, sum(amount_rp) as total, count(*) as visits from public.transactions group by user_id) s
        join public.profiles p on p.id = s.user_id
        where s.user_id <> uid and v_visits > 0
        order by abs(s.total - v_total)::numeric / greatest(v_total, 1) + abs(s.visits - v_visits)::numeric / greatest(v_visits, 1)
        limit 5) x), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'dueOn', n.due_on, 'done', n.done,
          'createdAt', n.created_at, 'author', (select username::text from public.profiles where id = n.author)) order by n.created_at desc)
        from public.crm_notes n where n.user_id = uid), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(tag order by tag) from public.crm_tags where user_id = uid), '[]'::jsonb)
  );
end $$;

revoke execute on function public.crm_overview(date, date, text) from public, anon;
revoke execute on function public.crm_segments(text) from public, anon;
revoke execute on function public.crm_member_extra(text) from public, anon;
grant execute on function public.crm_overview(date, date, text) to authenticated;
grant execute on function public.crm_segments(text) to authenticated;
grant execute on function public.crm_member_extra(text) to authenticated;

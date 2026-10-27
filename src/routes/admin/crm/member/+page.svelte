<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { loyalty } from '#lib/services';
	import type { CrmMemberDetail } from '#lib/services/loyalty';
	import { OUTLETS } from '#lib/config';
	import { session } from '#lib/stores/session.svelte';
	import CrmTabs from '#lib/components/crm/CrmTabs.svelte';
	import Radar from '#lib/components/crm/Radar.svelte';
	import Donut from '#lib/components/crm/Donut.svelte';
	import Heatmap from '#lib/components/crm/Heatmap.svelte';
	import LineChart from '#lib/components/crm/LineChart.svelte';
	import { OUTLET_COLOR, rp, short } from '#lib/components/crm/palette';
	import '#lib/components/crm/crm.css';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	const username = $derived(page.url.searchParams.get('u') ?? '');
	let d = $state<CrmMemberDetail | null>(null);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		const u = username;
		if (!session.user?.isAdmin || !u) return;
		loading = true;
		error = '';
		loyalty
			.crmMember(u)
			.then((res) => (d = res))
			.catch((e) => {
				d = null;
				error = e instanceof Error && /not found/i.test(e.message) ? `No member with the username @${u}.` : e instanceof Error ? e.message : 'Could not load this member.';
			})
			.finally(() => (loading = false));
	});

	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const fdate = (iso: string | null, long = false) =>
		iso ? new Date(iso).toLocaleDateString('en-GB', long ? { day: '2-digit', month: 'long', year: 'numeric' } : { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
	const outletName = (c: string | null) => OUTLETS.find((o) => o.code === c)?.name ?? c ?? '—';
	const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	const monthLabel = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short' });
	const wa = (p: string | null) => (p ? `https://wa.me/${p.replace(/\D/g, '')}` : null);

	const radarAxes = ['Frequency', 'Spend', 'Recency', 'Outlets', 'Rewards used', 'Engagement'];
	const KEYS = ['frequency', 'monetary', 'recency', 'variety', 'loyalty', 'engagement'] as const;
	const radarSeries = $derived(
		d
			? [
					{ name: '@' + d.profile.username, color: '#bd784e', values: KEYS.map((k) => (d!.radar.max[k] ? (d!.radar.member[k] / d!.radar.max[k]) * 100 : 0)) },
					{ name: 'Average member', color: '#f2e8da', dashed: true, values: KEYS.map((k) => (d!.radar.max[k] ? (d!.radar.avg[k] / d!.radar.max[k]) * 100 : 0)) }
				]
			: []
	);

	const donut = $derived((d?.byOutlet ?? []).filter((o) => o.revenue > 0).map((o) => ({ label: o.name, value: o.revenue, color: OUTLET_COLOR[o.code] ?? '#bd784e' })));
	const maxOutlet = $derived(Math.max(1, ...(d?.byOutlet.map((o) => o.revenue) ?? [1])));
	const monthly = $derived((d?.monthly ?? []).map((m) => ({ label: monthLabel(m.m), v: m.revenue })));
	const hours = $derived.by(() => {
		const hs = (d?.heatmap ?? []).filter((x) => x.n > 0).map((x) => x.h);
		const lo = hs.length ? Math.min(...hs) : 8;
		const hi = hs.length ? Math.max(...hs) : 20;
		return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
	});
	const grid = $derived(DAYS.map((_, i) => hours.map((h) => d?.heatmap.find((x) => x.d === i + 1 && x.h === h)?.n ?? 0)));
	const habit = $derived.by(() => {
		const dayTotals = grid.map((row) => row.reduce((a, b) => a + b, 0));
		const hourTotals = hours.map((_, j) => grid.reduce((a, row) => a + row[j], 0));
		const bestDay = dayTotals.indexOf(Math.max(...dayTotals));
		const bestHour = hours[hourTotals.indexOf(Math.max(...hourTotals))];
		return dayTotals.some((n) => n > 0) ? `Usually comes on ${['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][bestDay]}, around ${bestHour}:00.` : '';
	});
	const topOutlet = $derived([...(d?.byOutlet ?? [])].sort((a, b) => b.visits - a.visits)[0]);
	const xpPct = $derived.by(() => {
		if (!d || d.standing.nextLevelXp === null) return 100;
		return Math.min(100, Math.round((d.standing.xp / d.standing.nextLevelXp) * 100));
	});
	const statusCls = (s: string) => (s === 'used' ? 'mute' : s === 'expired' ? 'bad' : 'ok');
</script>

{#if session.user?.isAdmin}
	<div class="crm-page">
		<header class="crm-top">
			<div>
				<a class="back" href="/admin/crm/members">‹ All members</a>
				<h1>Member profile</h1>
				<CrmTabs active="members" />
			</div>
		</header>

		{#if error}<div class="crm-alert" role="alert">{error}</div>{/if}

		{#if d}
			{@const p = d.profile}
			<div class="crm-stack" class:dim={loading}>
				<section class="crm-card hero">
					<div class="avatar" aria-hidden="true">{initials(p.fullName)}</div>
					<div class="who">
						<h2>{p.fullName} <span class="crm-chip">{d.standing.levelName}</span></h2>
						<p class="handle">@{p.username} · {p.memberId}</p>
						<div class="tags">
							<span class="crm-chip" class:ok={p.emailConfirmed} class:bad={!p.emailConfirmed}>{p.emailConfirmed ? 'Email confirmed' : 'Email not confirmed'}</span>
							<span class="crm-chip" class:ok={p.profileComplete} class:mute={!p.profileComplete}>{p.profileComplete ? 'Profile complete' : 'Profile incomplete'}</span>
							{#if p.isAdmin}<span class="crm-chip">Admin</span>{/if}
							{#each p.socials as s (s.platform)}<span class="crm-chip mute">{s.platform} · {s.handle}</span>{/each}
						</div>
					</div>
					<dl class="facts">
						<div><dt>Email</dt><dd>{p.email}</dd></div>
						<div><dt>WhatsApp</dt><dd>{#if wa(p.whatsapp)}<a href={wa(p.whatsapp)} target="_blank" rel="noopener">{p.whatsapp}</a>{:else}—{/if}</dd></div>
						<div><dt>Home outlet</dt><dd>{outletName(p.homeOutlet)}</dd></div>
						<div><dt>Birthday</dt><dd>{fdate(p.birthday, true)}</dd></div>
						<div><dt>Joined</dt><dd>{fdate(p.createdAt, true)}</dd></div>
						<div><dt>Last sign-in</dt><dd>{fdate(p.lastSignIn)}</dd></div>
					</dl>
				</section>

				<section class="crm-kpis" aria-label="Key numbers">
					<div class="crm-kpi"><span class="k">Total spend</span><b>{short(d.stats.total)}</b><span class="note">{rp(d.stats.total)}</span></div>
					<div class="crm-kpi"><span class="k">Visits</span><b>{d.stats.visits}</b><span class="note">since {fdate(d.stats.firstVisit)}</span></div>
					<div class="crm-kpi"><span class="k">Avg ticket</span><b>{short(d.stats.avgTicket)}</b><span class="note">biggest {short(d.stats.maxTicket)}</span></div>
					<div class="crm-kpi"><span class="k">Visit rhythm</span><b>{d.stats.avgGapDays === null ? '—' : d.stats.avgGapDays + ' d'}</b><span class="note">average gap between visits</span></div>
					<div class="crm-kpi"><span class="k">Last visit</span><b>{d.stats.daysSinceLast === null ? '—' : d.stats.daysSinceLast === 0 ? 'Today' : d.stats.daysSinceLast + ' d'}</b><span class="note">{fdate(d.stats.lastVisit)}</span></div>
					<div class="crm-kpi"><span class="k">Spend rank</span><b>{d.stats.visits ? '#' + d.stats.rank : '—'}</b><span class="note">of {d.stats.spenders} buyers</span></div>
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Behaviour profile <small>vs the average member</small></h2>
						<Radar axes={radarAxes} series={radarSeries} size={320} />
						<p class="cap">Each axis is scaled to the best member (100). The dashed shape is the average member, so anything outside it is above average.</p>
					</article>

					<article class="crm-card">
						<h2>Level and loyalty</h2>
						<div class="lvl">
							<div class="row"><b>{d.standing.levelName}</b><span>{d.standing.xp.toLocaleString('id-ID')} XP</span></div>
							<div class="track"><i style:width="{xpPct}%"></i></div>
							<p class="cap">{d.standing.nextLevelName ? `${(d.standing.nextLevelXp! - d.standing.xp).toLocaleString('id-ID')} XP to ${d.standing.nextLevelName}` : 'Top level reached.'}</p>
						</div>
						<div class="stamps" aria-label="Stamps on the current card">
							{#each Array.from({ length: d.standing.stampsPerCard }, (_, i) => i) as i (i)}
								<i class:on={i < d.standing.stampsOnCard}></i>
							{/each}
						</div>
						<p class="cap">{d.standing.stampsOnCard} of {d.standing.stampsPerCard} stamps on the current card · {d.standing.cardsCompleted} {d.standing.cardsCompleted === 1 ? 'card' : 'cards'} completed</p>
						<div class="mini">
							<div><b>{d.standing.beans.toLocaleString('id-ID')}</b><span>Beans now</span></div>
							<div><b>{d.standing.lifetimeBeans.toLocaleString('id-ID')}</b><span>Beans earned</span></div>
							<div><b>{d.vouchers.filter((v) => v.status === 'used').length}</b><span>Rewards used</span></div>
						</div>
					</article>
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Where they shop</h2>
						{#if donut.length === 0}
							<p class="crm-empty">No purchases yet.</p>
						{:else}
							<Donut segments={donut} big={String(d.stats.visits)} small="visits" format={rp} size={170} />
							<div class="orows">
								{#each d.byOutlet as o (o.code)}
									<div class="orow">
										<div class="ol"><b>{o.name}</b><span>{o.visits} visits · last {fdate(o.lastVisit)}</span></div>
										<div class="track"><i style:width="{(o.revenue / maxOutlet) * 100}%" style:background={OUTLET_COLOR[o.code]}></i></div>
										<strong>{short(o.revenue)}</strong>
									</div>
								{/each}
							</div>
							{#if topOutlet && topOutlet.visits > 0}
								<p class="cap">Shops most at {topOutlet.name}{topOutlet.code === p.homeOutlet ? ' (their home outlet).' : `, not their home outlet (${outletName(p.homeOutlet)}).`}</p>
							{/if}
						{/if}
					</article>

					<article class="crm-card">
						<h2>Spending by month <small>last 12 months</small></h2>
						<LineChart points={monthly} format={short} height={190} />
						<p class="cap">Visits per month: {d.monthly.map((m) => m.visits).join(' · ')}</p>
					</article>
				</section>

				<section class="crm-card">
					<h2>Habits <small>when this member usually buys (Jakarta time)</small></h2>
					<Heatmap rows={DAYS} cols={hours.map(String)} data={grid} unit=" visits" cell={26} />
					{#if habit}<p class="cap">{habit}</p>{/if}
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Rewards <small>latest 40</small></h2>
						{#if d.vouchers.length === 0}
							<p class="crm-empty">No rewards yet.</p>
						{:else}
							<div class="crm-scroll">
								<table class="crm-table">
									<thead><tr><th>Reward</th><th>From</th><th>Status</th><th class="r">Date</th></tr></thead>
									<tbody>
										{#each d.vouchers as v, i (i)}
											<tr>
												<td><b>{v.reward}</b></td>
												<td>{v.source === 'stamp' ? `Stamp ${v.detail}` : `${v.detail} beans`}</td>
												<td><span class="crm-chip {statusCls(v.status)}">{v.status === 'used' ? `Used · ${outletName(v.usedOutlet)}` : v.status}</span></td>
												<td class="r">{fdate(v.usedAt ?? v.createdAt)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</article>

					<article class="crm-card">
						<h2>Latest purchases</h2>
						{#if d.recent.length === 0}
							<p class="crm-empty">No purchases yet.</p>
						{:else}
							<ul class="tl">
								{#each d.recent as t (t.id)}
									<li>
										<i style:background={OUTLET_COLOR[t.outlet]}></i>
										<div><b>{rp(t.amount)}</b><span>{outletName(t.outlet)} · {fdate(t.createdAt)}</span></div>
									</li>
								{/each}
							</ul>
						{/if}
					</article>
				</section>

				<section class="crm-card nodata">
					<h2>Favorite menu</h2>
					<p class="cap">Not tracked yet. Purchases only record the amount and outlet, not what was ordered, so this card cannot show a favorite item. It needs item-level data from the cashier or the POS.</p>
				</section>
			</div>
		{:else if loading}
			<p class="crm-loading">Loading the member…</p>
		{/if}
	</div>
{/if}

<style>
	.hero {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 18px 20px;
		align-items: start;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: var(--grad-primary);
		font-size: 24px;
		font-weight: 800;
	}
	.who h2 {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin: 0 0 4px;
		font-size: 22px;
	}
	.handle {
		margin: 0 0 10px;
		font-size: 12px;
		color: var(--text-3);
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.facts {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px 20px;
		margin: 0;
		padding-top: 14px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	.facts dt {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--copper-soft);
	}
	.facts dd {
		margin: 3px 0 0;
		font-size: 13px;
		word-break: break-word;
	}
	.facts a {
		color: var(--copper-light);
	}
	.lvl .row {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		margin-bottom: 8px;
	}
	.lvl .row span {
		color: var(--text-3);
	}
	.track {
		height: 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.track i {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--grad-primary);
	}
	.stamps {
		display: flex;
		gap: 6px;
		margin-top: 18px;
	}
	.stamps i {
		flex: 1;
		height: 26px;
		border-radius: 50%;
		max-width: 26px;
		border: 1.5px dashed rgba(255, 255, 255, 0.3);
	}
	.stamps i.on {
		border: 0;
		background: var(--copper);
	}
	.mini {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 16px;
	}
	.mini div {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 12px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
	}
	.mini b {
		font-size: 18px;
		font-weight: 800;
	}
	.mini span {
		font-size: 10px;
		color: var(--text-3);
	}
	.orows {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 16px;
	}
	.orow {
		display: grid;
		grid-template-columns: minmax(120px, 170px) 1fr auto;
		align-items: center;
		gap: 12px;
	}
	.ol {
		display: flex;
		flex-direction: column;
	}
	.ol b {
		font-size: 13px;
	}
	.ol span {
		font-size: 10px;
		color: var(--text-3);
	}
	.orow strong {
		min-width: 52px;
		text-align: right;
		font-size: 13px;
	}
	.tl {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.tl li {
		display: grid;
		grid-template-columns: 10px 1fr;
		gap: 12px;
		align-items: start;
	}
	.tl i {
		width: 10px;
		height: 10px;
		margin-top: 4px;
		border-radius: 50%;
	}
	.tl b {
		display: block;
		font-size: 13px;
	}
	.tl span {
		font-size: 11px;
		color: var(--text-3);
	}
	.nodata {
		border-style: dashed;
	}
	@media (max-width: 700px) {
		.hero {
			grid-template-columns: 1fr;
		}
		.facts {
			grid-template-columns: repeat(2, 1fr);
		}
		.orow {
			grid-template-columns: 1fr auto;
		}
		.orow .track {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
</style>

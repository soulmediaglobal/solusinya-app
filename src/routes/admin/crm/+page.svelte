<script lang="ts">
	import { goto } from '$app/navigation';
	import { loyalty } from '#lib/services';
	import type { CrmOverview, CrmSegmentRow } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';
	import { crmFilter } from '#lib/stores/crmFilter.svelte';
	import { downloadCsv } from '#lib/csv';
	import CrmTabs from '#lib/components/crm/CrmTabs.svelte';
	import FilterBar from '#lib/components/crm/FilterBar.svelte';
	import LineChart from '#lib/components/crm/LineChart.svelte';
	import Columns from '#lib/components/crm/Columns.svelte';
	import Donut from '#lib/components/crm/Donut.svelte';
	import Gauge from '#lib/components/crm/Gauge.svelte';
	import { OUTLET_COLOR, PALETTE, rp, short } from '#lib/components/crm/palette';
	import '#lib/components/crm/crm.css';

	// Admin only. Everyone else goes back to Home (the database enforces this too).
	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	let data = $state<CrmOverview | null>(null);
	let people = $state<CrmSegmentRow[]>([]);
	let loading = $state(false);
	let error = $state('');
	let costMsg = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			const outlet = crmFilter.outlet || null;
			[data, people] = await Promise.all([loyalty.crmOverview(crmFilter.from, crmFilter.to, outlet), loyalty.crmSegments(outlet)]);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load the dashboard.';
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		if (session.user?.isAdmin) load();
	});

	const num = (n: number) => n.toLocaleString('id-ID');
	const delta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
	const dlabel = (d: number | null, suffix: string) => (d === null ? 'No earlier period' : (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d) + '% ' + suffix);
	const dateLabel = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
	const wa = (phone: string | null, text: string) => (phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}` : null);
	const SOURCE_LABEL: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', friend: 'A friend', store_qr: 'Store QR', other: 'Other', unknown: 'Not asked' };

	const k = $derived(data?.kpi);
	const cards = $derived(
		!data || !k
			? []
			: [
					{ k: 'Revenue', v: short(k.revenue), n: dlabel(delta(k.revenue, k.prevRevenue), 'vs previous ' + data.days + ' days'), d: delta(k.revenue, k.prevRevenue) },
					{ k: 'Visits', v: num(k.visits), n: dlabel(delta(k.visits, k.prevVisits), 'vs previous period'), d: delta(k.visits, k.prevVisits) },
					{ k: 'Active members', v: num(k.activeMembers), n: dlabel(delta(k.activeMembers, k.prevActiveMembers), 'vs previous period'), d: delta(k.activeMembers, k.prevActiveMembers) },
					{ k: 'Average ticket', v: short(k.avgTicket), n: dlabel(delta(k.avgTicket, k.prevAvgTicket), 'vs previous period'), d: delta(k.avgTicket, k.prevAvgTicket) },
					{ k: 'New members', v: num(k.newMembers), n: dlabel(delta(k.newMembers, k.prevNewMembers), 'vs previous period') + ` · ${num(k.totalMembers)} total`, d: delta(k.newMembers, k.prevNewMembers) },
					{ k: 'Repeat rate', v: k.repeatRate + '%', n: 'Active members who came more than once', d: null }
				]
	);
	const pace = $derived(data ? Math.min(100, (data.forecast.monthToDate / Math.max(1, data.forecast.projected)) * 100) : 0);
	const top = $derived(people.slice(0, 5));
	const maxOutlet = $derived(Math.max(1, ...(data?.byOutlet.map((x) => x.revenue) ?? [1])));
	const maxLevel = $derived(Math.max(1, ...(data?.levels.map((x) => x.members) ?? [1])));
	const redeem = $derived(data && data.rewardEconomics.issued ? Math.round((data.rewardEconomics.used / data.rewardEconomics.issued) * 100) : 0);
	const costShare = $derived(data && data.kpi.revenue > 0 ? ((data.rewardEconomics.costUsed / data.kpi.revenue) * 100).toFixed(1).replace('.', ',') : '0');
	const weekDelta = $derived(data ? delta(data.week.revenue, data.week.prevRevenue) : null);

	function exportCsv() {
		if (!data) return;
		downloadCsv(`solu-club-sales-${data.from}_${data.to}.csv`, ['date', 'revenue_rp', 'visits', 'previous_period_revenue_rp'], data.daily.map((x) => [x.d, x.revenue, x.visits, Math.round(x.prevRevenue)]));
	}
	async function saveCost(id: string, raw: string) {
		costMsg = '';
		const clean = raw.replace(/\D/g, '');
		try {
			await loyalty.crmSetRewardCost(id, clean === '' ? null : Number(clean));
			costMsg = 'Saved.';
			await load();
		} catch (e) {
			costMsg = e instanceof Error ? e.message : 'Could not save.';
		}
	}
</script>

{#if session.user?.isAdmin}
	<div class="crm-page">
		<header class="crm-top">
			<div>
				<a class="back" href="/admin">‹ Back to admin</a>
				<h1>Solu Club CRM</h1>
				<CrmTabs active="overview" />
				<p class="sub">
					{#if data}Updated {new Date(data.generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {dateLabel(data.from)} to {dateLabel(data.to)}{:else}Loading…{/if}
				</p>
			</div>
			<div class="actions">
				<FilterBar onchange={load} />
				<button type="button" class="ghost" onclick={exportCsv} disabled={!data}>Export CSV</button>
				<button type="button" class="ghost" onclick={load} disabled={loading} aria-label="Refresh">↻</button>
			</div>
		</header>

		{#if error}<div class="crm-alert" role="alert">{error}</div>{/if}

		{#if data}
			<div class="crm-stack" class:dim={loading}>
				{#if data.alerts.length}
					<section class="alerts" aria-label="Things to look at">
						{#each data.alerts as a (a.key)}
							<a class="al {a.level}" href={a.key === 'overdue_regulars' || a.key === 'followups_due' ? '/admin/crm/segments' : a.key === 'birthdays' ? '#birthdays' : '#rewards'}>
								<i></i><span>{a.text}</span>
							</a>
						{/each}
					</section>
				{/if}

				<section class="crm-kpis" aria-label="Key numbers">
					{#each cards as c (c.k)}
						<div class="crm-kpi">
							<span class="k">{c.k}</span>
							<b>{c.v}</b>
							<span class="note" class:up={c.d !== null && c.d >= 0} class:down={c.d !== null && c.d < 0}>{c.n}</span>
						</div>
					{/each}
				</section>

				<section class="crm-grid3">
					<article class="crm-card">
						<h2>Revenue per day <small>previous period total: {short(data.kpi.prevRevenue)}</small></h2>
						<LineChart points={data.daily.map((x) => ({ label: dateLabel(x.d), v: x.revenue }))} format={short} height={220} />
					</article>
					<article class="crm-card">
						<h2>This week vs last week</h2>
						<Columns
							height={110}
							format={short}
							items={[
								{ label: 'Previous 7 days', n: data.week.prevRevenue, color: '#8a6a55' },
								{ label: 'Last 7 days', n: data.week.revenue, color: '#bd784e' }
							]}
						/>
						<p class="cap">
							Last 7 days: {rp(data.week.revenue)} ({data.week.visits} visits) against {rp(data.week.prevRevenue)} ({data.week.prevVisits} visits) the 7 days before.
							{#if weekDelta !== null}That is {Math.abs(weekDelta)}% {weekDelta >= 0 ? 'up' : 'down'}.{/if}
						</p>
					</article>
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>This month so far</h2>
						<div class="fc">
							<b>{rp(data.forecast.monthToDate)}</b>
							<span>after {data.forecast.daysElapsed} of {data.forecast.daysInMonth} days</span>
						</div>
						<div class="meter" role="img" aria-label="Month progress">
							<i style:width="{pace}%"></i>
							{#if data.forecast.prevMonth > 0}
								<u style:left="{Math.min(100, (data.forecast.prevMonth / Math.max(1, data.forecast.projected, data.forecast.prevMonth)) * 100)}%" title="Last month: {rp(data.forecast.prevMonth)}"></u>
							{/if}
						</div>
						<p class="cap">
							At this pace the month ends near <b>{rp(data.forecast.projected)}</b>{data.forecast.prevMonth > 0 ? `, compared with ${rp(data.forecast.prevMonth)} last month (the white mark)` : ''}. This is a straight-line estimate and does not know about weekends or events.
						</p>
					</article>

					<article class="crm-card">
						<h2>By outlet <small>change against the previous period</small></h2>
						<div class="rows">
							{#each data.byOutlet as o (o.code)}
								{@const dd = delta(o.revenue, o.prevRevenue)}
								<div class="hrow">
									<div class="hl"><b>{o.name}</b><span>{num(o.visits)} visits</span></div>
									<div class="track"><i style:width="{(o.revenue / maxOutlet) * 100}%" style:background={OUTLET_COLOR[o.code] ?? '#bd784e'}></i></div>
									<strong>{short(o.revenue)}</strong>
									<em class:up={dd !== null && dd >= 0} class:down={dd !== null && dd < 0}>{dd === null ? '–' : (dd >= 0 ? '+' : '') + dd + '%'}</em>
								</div>
							{/each}
						</div>
					</article>
				</section>

				<section class="crm-grid2" id="rewards">
					<article class="crm-card">
						<h2>Reward economics</h2>
						<div class="mini">
							<div><b>{num(data.rewardEconomics.issued)}</b><span>Issued</span></div>
							<div><b>{num(data.rewardEconomics.used)}</b><span>Used</span></div>
							<div><b>{redeem}%</b><span>Used of issued</span></div>
							<div><b>{data.rewardEconomics.costKnown ? costShare + '%' : '–'}</b><span>Cost vs revenue</span></div>
						</div>
						<div class="crm-scroll">
							<table class="crm-table">
								<thead><tr><th>Reward</th><th class="r">Issued</th><th class="r">Used</th><th class="r">Cost each (Rp)</th></tr></thead>
								<tbody>
									{#each data.rewardEconomics.byReward as r (r.id)}
										<tr>
											<td><b>{r.name}</b></td>
											<td class="r">{r.issued}</td>
											<td class="r">{r.used}</td>
											<td class="r">
												<input class="cost" inputmode="numeric" value={r.unitCost ?? ''} placeholder="not set" aria-label="Cost of {r.name}" onchange={(e) => saveCost(r.id, e.currentTarget.value)} />
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<p class="cap">
							Issued by: stamps {data.rewardEconomics.bySource.stamp}, beans {data.rewardEconomics.bySource.beans}, gifts {data.rewardEconomics.bySource.gift}. {data.rewardEconomics.expired} expired unused in this period.
							{#if !data.rewardEconomics.costKnown}Fill in what each reward costs you to see its share of revenue.{/if}
							{costMsg}
						</p>
					</article>

					<article class="crm-card">
						<h2>Favorite menu <small>top 10 in this period</small></h2>
						{#if data.topMenu.length}
							<Columns items={data.topMenu.map((m, i) => ({ label: m.name, n: m.qty, color: PALETTE[i % PALETTE.length] }))} height={150} />
							<p class="cap">Only {data.menuCoverage}% of transactions in this period listed items, so treat this as a sample, not the full picture.</p>
						{:else}
							<p class="crm-empty">No items recorded yet. Tick what a member had when you add a transaction (the menu is under Admin, Manage the menu).</p>
						{/if}
					</article>
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Where members found us</h2>
						<Donut
							segments={data.signupSources.map((s, i) => ({ label: SOURCE_LABEL[s.source] ?? s.source, value: s.members, color: PALETTE[i % PALETTE.length] }))}
							big={num(data.kpi.totalMembers)}
							small="members"
						/>
					</article>
					<article class="crm-card">
						<h2>Promo opt-in</h2>
						<Gauge value={data.optIn.total ? (data.optIn.yes / data.optIn.total) * 100 : 0} label="Agreed to promos" note="{data.optIn.yes} of {data.optIn.total} members" />
						<p class="cap">Only these members can be put in a WhatsApp campaign.</p>
					</article>
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Levels</h2>
						<div class="rows">
							{#each data.levels as l (l.level)}
								<div class="hrow">
									<div class="hl"><b>{l.name}</b><span>Level {l.level}</span></div>
									<div class="track"><i style:width="{(l.members / maxLevel) * 100}%"></i></div>
									<strong>{num(l.members)}</strong>
									<span></span>
								</div>
							{/each}
						</div>
					</article>

					<article class="crm-card">
						<h2>Top spenders <small>of all time</small></h2>
						<div class="crm-scroll">
							<table class="crm-table">
								<tbody>
									{#each top as m (m.username)}
										<tr class="link" onclick={() => goto('/admin/crm/member?u=' + encodeURIComponent(m.username))}>
											<td><b>{m.fullName}</b><span>@{m.username}</span></td>
											<td class="r"><b>{short(m.total)}</b><span>{m.visits} visits</span></td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</article>
				</section>

				<article class="crm-card" id="birthdays">
					<h2>Birthdays in the next 30 days</h2>
					{#if data.birthdays.length === 0}
						<p class="crm-empty">Nobody has a birthday in the next 30 days.</p>
					{:else}
						<div class="crm-scroll">
							<table class="crm-table">
								<tbody>
									{#each data.birthdays as b (b.username)}
										{@const link = b.optIn ? wa(b.whatsapp, `Hi ${b.fullName.split(' ')[0]}! Happy birthday from Solu Club. A little treat is waiting for you at the counter.`) : null}
										<tr>
											<td><b>{b.fullName}</b><span>@{b.username}</span></td>
											<td>{new Date('2000-' + b.md + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
											<td class="r">
												{#if link}<a class="crm-btn" href={link} target="_blank" rel="noopener">WhatsApp</a>
												{:else}<span class="crm-chip mute">{b.optIn ? 'no number' : 'no promo opt-in'}</span>{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</article>
			</div>
		{:else if !error}
			<p class="crm-loading">Loading…</p>
		{/if}
	</div>
{/if}

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 10px;
	}
	.ghost {
		height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--text-2);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.ghost:disabled {
		opacity: 0.5;
	}
	.alerts {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.al {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.04);
		color: #fff;
		font-size: 12px;
		font-weight: 600;
		text-decoration: none;
	}
	.al i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--copper);
	}
	.al.bad {
		border-color: var(--error);
	}
	.al.bad i {
		background: var(--error);
	}
	.al.warn i {
		background: #e0b050;
	}
	.al.info i {
		background: #8fb4d9;
	}
	.up {
		color: var(--success) !important;
	}
	.down {
		color: var(--error) !important;
	}
	.fc {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
	}
	.fc b {
		font-size: 28px;
		font-weight: 800;
	}
	.fc span {
		font-size: 12px;
		color: var(--text-3);
	}
	.meter {
		position: relative;
		height: 12px;
		margin-top: 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.1);
	}
	.meter i {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--grad-primary);
	}
	.meter u {
		position: absolute;
		top: -4px;
		width: 2px;
		height: 20px;
		background: #f2e8da;
		text-decoration: none;
	}
	.rows {
		display: grid;
		gap: 12px;
	}
	.hrow {
		display: grid;
		grid-template-columns: minmax(90px, 1.1fr) 2fr auto 44px;
		align-items: center;
		gap: 12px;
	}
	.hl b {
		display: block;
		font-size: 13px;
	}
	.hl span {
		font-size: 10px;
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
	.hrow strong {
		font-size: 12px;
		text-align: right;
	}
	.hrow em {
		font-style: normal;
		font-size: 11px;
		font-weight: 700;
		text-align: right;
		color: var(--text-3);
	}
	.mini {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		margin-bottom: 14px;
	}
	.mini div {
		display: grid;
		gap: 2px;
	}
	.mini b {
		font-size: 20px;
		font-weight: 800;
	}
	.mini span {
		font-size: 10px;
		color: var(--text-3);
	}
	.cost {
		width: 92px;
		height: 30px;
		padding: 0 8px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
		font-size: 12px;
		text-align: right;
	}
	.cap b {
		color: #fff;
	}
</style>

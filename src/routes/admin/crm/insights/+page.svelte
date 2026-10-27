<script lang="ts">
	import { goto } from '$app/navigation';
	import { loyalty } from '#lib/services';
	import type { CrmInsights } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';
	import CrmTabs from '#lib/components/crm/CrmTabs.svelte';
	import Radar from '#lib/components/crm/Radar.svelte';
	import Donut from '#lib/components/crm/Donut.svelte';
	import Heatmap from '#lib/components/crm/Heatmap.svelte';
	import Funnel from '#lib/components/crm/Funnel.svelte';
	import CohortTable from '#lib/components/crm/CohortTable.svelte';
	import Columns from '#lib/components/crm/Columns.svelte';
	import Scatter from '#lib/components/crm/Scatter.svelte';
	import Gauge from '#lib/components/crm/Gauge.svelte';
	import { OUTLET_COLOR, rp, short } from '#lib/components/crm/palette';
	import '#lib/components/crm/crm.css';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	const RANGES = [30, 90, 180] as const;
	let days = $state<number>(90);
	let data = $state<CrmInsights | null>(null);
	let loading = $state(false);
	let error = $state('');

	async function load(d: number) {
		loading = true;
		error = '';
		try {
			data = await loyalty.crmInsights(d);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load the insights.';
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		if (session.user?.isAdmin) load(days);
	});

	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

	const hours = $derived.by(() => {
		const hs = (data?.heatmap ?? []).filter((x) => x.n > 0).map((x) => x.h);
		const lo = hs.length ? Math.min(...hs) : 7;
		const hi = hs.length ? Math.max(...hs) : 21;
		return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
	});
	const grid = $derived(DAYS.map((_, d) => hours.map((h) => data?.heatmap.find((x) => x.d === d + 1 && x.h === h)?.n ?? 0)));
	const byHour = $derived(hours.map((h, j) => ({ label: String(h), n: grid.reduce((a, row) => a + row[j], 0) })));
	const byDay = $derived(DAYS.map((label, i) => ({ label, n: grid[i].reduce((a, b) => a + b, 0) })));
	const peak = $derived.by(() => {
		const bd = [...byDay].sort((a, b) => b.n - a.n)[0];
		const bh = [...byHour].sort((a, b) => b.n - a.n)[0];
		return bd && bh && bd.n > 0 ? `Busiest: ${bd.label} and around ${bh.label}:00.` : '';
	});

	const radarAxes = ['Revenue', 'Visits', 'Avg ticket', 'Members', 'Repeat rate', 'New members'];
	const radarSeries = $derived.by(() => {
		const o = data?.outletRadar ?? [];
		const rows = o.map((x) => [x.revenue, x.visits, x.avgTicket, x.members, pct(x.repeatMembers, x.members), x.newMembers]);
		const max = radarAxes.map((_, i) => Math.max(1, ...rows.map((r) => r[i])));
		return o.map((x, k) => ({ name: x.name, color: OUTLET_COLOR[x.code] ?? '#bd784e', values: rows[k].map((v, i) => (v / max[i]) * 100) }));
	});
	const donut = $derived((data?.outletRadar ?? []).map((x) => ({ label: x.name, value: x.revenue, color: OUTLET_COLOR[x.code] ?? '#bd784e' })));
	const donutTotal = $derived(donut.reduce((a, s) => a + s.value, 0));

	const codes = $derived((data?.outletRadar ?? []).map((x) => x.code));
	const names = $derived((data?.outletRadar ?? []).map((x) => x.name));
	const cross = $derived(codes.map((a) => codes.map((b) => data?.crossover.find((x) => x.a === a && x.b === b)?.n ?? 0)));

	const funnel = $derived(
		data
			? [
					{ label: 'Signed up', n: data.funnel.registered },
					{ label: 'Confirmed email', n: data.funnel.verified },
					{ label: 'Made a first purchase', n: data.funnel.firstVisit },
					{ label: 'Came back (2+ visits)', n: data.funnel.repeat },
					{ label: 'Completed a stamp card', n: data.funnel.completedCard }
				]
			: []
	);

	const scatter = $derived(
		(data?.scatter ?? []).map((p) => ({
			x: p.visits,
			y: p.total,
			r: 3 + p.level * 1.6,
			color: p.daysSince <= 14 ? '#7fb98a' : p.daysSince <= 30 ? '#d59b75' : '#e08a78',
			label: `@${p.username} · ${p.visits} visits · ${rp(p.total)} · last visit ${p.daysSince} days ago`
		}))
	);
</script>

{#if session.user?.isAdmin}
	<div class="crm-page">
		<header class="crm-top">
			<div>
				<a class="back" href="/admin">‹ Back to admin</a>
				<h1>Insights</h1>
				<CrmTabs active="insights" />
			</div>
			<div class="crm-range" role="group" aria-label="Period">
				{#each RANGES as r (r)}
					<button type="button" class:on={days === r} onclick={() => (days = r)}>{r} days</button>
				{/each}
			</div>
		</header>

		{#if error}<div class="crm-alert" role="alert">{error}</div>{/if}

		{#if data}
			<div class="crm-stack" class:dim={loading}>
				<section class="crm-card">
					<h2>Health at a glance <small>all time</small></h2>
					<div class="gauges">
						<Gauge value={pct(data.funnel.verified, data.funnel.registered)} label="Email confirmed" note="of sign-ups" />
						<Gauge value={pct(data.funnel.firstVisit, data.funnel.registered)} label="Activation" note="sign-ups who bought" color="#d59b75" />
						<Gauge value={pct(data.funnel.repeat, data.funnel.firstVisit)} label="Repeat rate" note="buyers who came back" />
						<Gauge value={pct(data.funnel.completedCard, data.funnel.firstVisit)} label="Card completion" note="buyers with a full card" color="#8fb4d9" />
					</div>
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Outlet comparison <small>last {days} days, each axis scaled to the best outlet</small></h2>
						<Radar axes={radarAxes} series={radarSeries} size={320} />
					</article>
					<article class="crm-card">
						<h2>Revenue share <small>last {days} days</small></h2>
						<Donut segments={donut} big={short(donutTotal)} small="revenue" format={rp} size={210} />
						<p class="cap">Repeat rate is the share of an outlet's buyers who came at least twice in the period.</p>
					</article>
				</section>

				<section class="crm-card">
					<h2>When people buy <small>visits by weekday and hour (Jakarta time), last {days} days</small></h2>
					<Heatmap rows={DAYS} cols={hours.map(String)} data={grid} unit=" visits" cell={26} />
					{#if peak}<p class="cap">{peak}</p>{/if}
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Busiest hours</h2>
						<Columns items={byHour} height={110} />
					</article>
					<article class="crm-card">
						<h2>Busiest days</h2>
						<Columns items={byDay} height={110} color="var(--copper-light)" />
					</article>
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Member journey <small>all time</small></h2>
						<Funnel stages={funnel} />
					</article>
					<article class="crm-card">
						<h2>Retention by sign-up month</h2>
						<CohortTable cohorts={data.cohorts} />
						<p class="cap">Each row is the group who signed up that month. The cells show how many of them bought in that month and in the months after.</p>
					</article>
				</section>

				<section class="crm-grid2">
					<article class="crm-card">
						<h2>Ticket size <small>last {days} days</small></h2>
						<Columns items={data.ticketHist} height={120} />
					</article>
					<article class="crm-card">
						<h2>How often members buy <small>all time</small></h2>
						<Columns items={data.visitsDist} height={120} color="var(--copper-light)" />
					</article>
				</section>

				<section class="crm-card">
					<h2>Member map <small>visits vs total spend, bigger bubble = higher level</small></h2>
					<div class="key">
						<span><i style="background:#7fb98a"></i>Visited in the last 14 days</span>
						<span><i style="background:#d59b75"></i>15-30 days ago</span>
						<span><i style="background:#e08a78"></i>More than 30 days ago</span>
					</div>
					<Scatter points={scatter} xLabel="Visits" yLabel="Total spend" fx={(n) => String(Math.round(n))} fy={short} height={300} />
				</section>

				<section class="crm-card">
					<h2>Shopping across outlets <small>members who bought at both outlets, all time</small></h2>
					<Heatmap rows={names} cols={names} data={cross} showValues cell={64} unit=" members" />
					<p class="cap">The diagonal is each outlet's own member count. Off-diagonal cells show how many members shop at both, so you can see which outlets share customers.</p>
				</section>
			</div>
		{:else if loading}
			<p class="crm-loading">Loading the insights…</p>
		{/if}
	</div>
{/if}

<style>
	.gauges {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}
	.key {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 16px;
		margin-bottom: 8px;
		font-size: 11px;
		color: var(--text-2);
	}
	.key span {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.key i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	@media (max-width: 700px) {
		.gauges {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>

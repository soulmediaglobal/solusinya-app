<script lang="ts">
	import { goto } from '$app/navigation';
	import { loyalty } from '#lib/services';
	import type { CrmDashboard } from '#lib/services/loyalty';
	import { OUTLETS } from '#lib/config';
	import { session } from '#lib/stores/session.svelte';
	import CrmTabs from '#lib/components/crm/CrmTabs.svelte';

	// Admin only. Everyone else goes back to Home (the database enforces this too).
	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	const RANGES = [7, 30, 90] as const;
	let days = $state<number>(30);
	let data = $state<CrmDashboard | null>(null);
	let loading = $state(false);
	let error = $state('');

	async function load(d: number) {
		loading = true;
		error = '';
		try {
			data = await loyalty.crmDashboard(d);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load the dashboard.';
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		if (session.user?.isAdmin) load(days);
	});

	const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
	const short = (n: number) =>
		n >= 1e9 ? (n / 1e9).toFixed(1).replace('.', ',') + ' M' : n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' jt' : n >= 1e3 ? Math.round(n / 1e3) + ' rb' : String(Math.round(n));
	const num = (n: number) => n.toLocaleString('id-ID');
	const delta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
	const outletName = (c: string) => OUTLETS.find((o) => o.code === c)?.name ?? c;
	const dateLabel = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
	const ago = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
	const wa = (phone: string | null, text: string) => (phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}` : null);
	const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });

	const dr = $derived(data ? delta(data.sales.revenue, data.sales.prevRevenue) : null);
	const dv = $derived(data ? delta(data.sales.visits, data.sales.prevVisits) : null);
	const maxDaily = $derived(Math.max(1, ...(data?.sales.daily.map((x) => x.revenue) ?? [1])));
	const maxSignup = $derived(Math.max(1, ...(data?.members.signups.map((x) => x.n) ?? [1])));
	const maxOutlet = $derived(Math.max(1, ...(data?.sales.byOutlet.map((x) => x.revenue) ?? [1])));
	const maxLevel = $derived(Math.max(1, ...(data?.segments.levels.map((x) => x.members) ?? [1])));
	const maxReward = $derived(Math.max(1, ...(data?.rewards.byReward.map((x) => x.issued) ?? [1])));
	const health = $derived.by(() => {
		if (!data) return [];
		const m = data.members;
		const recent = Math.max(0, m.total - m.dormant30d - m.neverVisited);
		return [
			{ label: 'Visited in the last 30 days', n: recent, cls: 'a' },
			{ label: 'Quiet (30+ days)', n: m.dormant30d, cls: 'b' },
			{ label: 'Never visited', n: m.neverVisited, cls: 'c' }
		];
	});
</script>

{#if session.user?.isAdmin}
	<div class="page">
		<header class="top">
			<div>
				<a class="back" href="/admin">‹ Back to admin</a>
				<h1>Solu Club CRM</h1>
				<CrmTabs active="overview" />
				<p class="sub">
					{#if data}Updated {new Date(data.generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}{:else}Loading…{/if}
				</p>
			</div>
			<div class="range" role="group" aria-label="Period">
				{#each RANGES as r (r)}
					<button type="button" class:on={days === r} onclick={() => (days = r)}>{r} days</button>
				{/each}
				<button type="button" class="refresh" onclick={() => load(days)} disabled={loading} aria-label="Refresh">↻</button>
			</div>
		</header>

		{#if error}
			<div class="alert" role="alert">{error}</div>
		{/if}

		{#if data}
			<div class="body" class:dim={loading}>
				<section class="kpis" aria-label="Key numbers">
					<div class="kpi">
						<span class="k">Members</span>
						<b>{num(data.members.total)}</b>
						<span class="note">+{num(data.members.newInPeriod)} in {days} days</span>
					</div>
					<div class="kpi">
						<span class="k">Active members</span>
						<b>{num(data.members.activeInPeriod)}</b>
						<span class="note">{data.members.total ? Math.round((data.members.activeInPeriod / data.members.total) * 100) : 0}% of all members</span>
					</div>
					<div class="kpi">
						<span class="k">Revenue</span>
						<b>{short(data.sales.revenue)}</b>
						<span class="note" class:up={dr !== null && dr >= 0} class:down={dr !== null && dr < 0}>
							{dr === null ? 'No earlier period' : (dr >= 0 ? '▲ ' : '▼ ') + Math.abs(dr) + '% vs previous ' + days + ' days'}
						</span>
					</div>
					<div class="kpi">
						<span class="k">Visits</span>
						<b>{num(data.sales.visits)}</b>
						<span class="note" class:up={dv !== null && dv >= 0} class:down={dv !== null && dv < 0}>
							{dv === null ? 'No earlier period' : (dv >= 0 ? '▲ ' : '▼ ') + Math.abs(dv) + '% vs previous ' + days + ' days'}
						</span>
					</div>
					<div class="kpi">
						<span class="k">Average ticket</span>
						<b>{short(data.sales.avgTicket)}</b>
						<span class="note">{rp(data.sales.avgTicket)} per visit</span>
					</div>
					<div class="kpi">
						<span class="k">Vouchers used</span>
						<b>{num(data.rewards.usedInPeriod)}</b>
						<span class="note">{num(data.rewards.issuedInPeriod)} issued in {days} days</span>
					</div>
				</section>

				<section class="grid two">
					<article class="card">
						<h2>Daily revenue</h2>
						<div class="bars" role="img" aria-label="Daily revenue">
							{#each data.sales.daily as x (x.d)}
								<div class="bar" style:height="{Math.max(2, (x.revenue / maxDaily) * 100)}%" title="{dateLabel(x.d)} · {rp(x.revenue)} · {x.visits} visits"></div>
							{/each}
						</div>
						<div class="axis"><span>{dateLabel(data.sales.daily[0].d)}</span><span>{dateLabel(data.sales.daily[data.sales.daily.length - 1].d)}</span></div>
					</article>

					<article class="card">
						<h2>By outlet</h2>
						<div class="rows">
							{#each data.sales.byOutlet as o (o.code)}
								<div class="hrow">
									<div class="hl"><b>{o.name}</b><span>{num(o.visits)} visits · {num(o.members)} members</span></div>
									<div class="track"><i style:width="{(o.revenue / maxOutlet) * 100}%"></i></div>
									<strong>{short(o.revenue)}</strong>
								</div>
							{/each}
						</div>
					</article>
				</section>

				<section class="grid two">
					<article class="card">
						<h2>New sign-ups</h2>
						<div class="bars small" role="img" aria-label="New sign-ups per day">
							{#each data.members.signups as x (x.d)}
								<div class="bar alt" style:height="{Math.max(3, (x.n / maxSignup) * 100)}%" title="{dateLabel(x.d)} · {x.n} new"></div>
							{/each}
						</div>
						<div class="axis"><span>{dateLabel(data.members.signups[0].d)}</span><span>{dateLabel(data.members.signups[data.members.signups.length - 1].d)}</span></div>
						{#if data.members.unverified > 0}
							<p class="hint">{num(data.members.unverified)} {data.members.unverified === 1 ? 'person has' : 'people have'} signed up but not confirmed their email yet.</p>
						{/if}
					</article>

					<article class="card">
						<h2>Member health</h2>
						<div class="stack" role="img" aria-label="Member health">
							{#each health as h (h.label)}
								{#if h.n > 0}<i class={h.cls} style:flex-grow={h.n} title="{h.label}: {h.n}"></i>{/if}
							{/each}
						</div>
						<ul class="legend">
							{#each health as h (h.label)}
								<li><i class={h.cls}></i><span>{h.label}</span><b>{num(h.n)}</b></li>
							{/each}
						</ul>
					</article>
				</section>

				<section class="grid two">
					<article class="card">
						<h2>Levels</h2>
						<div class="rows">
							{#each data.segments.levels as l (l.level)}
								<div class="hrow">
									<div class="hl"><b>{l.name}</b><span>Level {l.level}</span></div>
									<div class="track"><i style:width="{(l.members / maxLevel) * 100}%"></i></div>
									<strong>{num(l.members)}</strong>
								</div>
							{/each}
						</div>
					</article>

					<article class="card">
						<h2>Rewards</h2>
						<div class="mini">
							<div><b>{num(data.rewards.available + data.rewards.active)}</b><span>Ready to use</span></div>
							<div><b>{num(data.rewards.used)}</b><span>Used</span></div>
							<div><b class="warn">{num(data.rewards.expired)}</b><span>Expired</span></div>
							<div><b>{num(data.rewards.bySource.stamp)} / {num(data.rewards.bySource.beans)}</b><span>Stamp / beans</span></div>
						</div>
						<div class="rows">
							{#each data.rewards.byReward as r (r.name)}
								<div class="hrow">
									<div class="hl"><b>{r.name}</b><span>{num(r.used)} used · {num(r.expired)} expired</span></div>
									<div class="track"><i style:width="{(r.issued / maxReward) * 100}%"></i></div>
									<strong>{num(r.issued)}</strong>
								</div>
							{/each}
						</div>
					</article>
				</section>

				<section class="grid two">
					<article class="card">
						<h2>Top spenders <small>all time</small></h2>
						{#if data.segments.topSpenders.length === 0}
							<p class="empty">No transactions yet.</p>
						{:else}
							<div class="scroll">
								<table>
									<thead><tr><th>Member</th><th>Outlet</th><th class="r">Visits</th><th class="r">Spent</th></tr></thead>
									<tbody>
										{#each data.segments.topSpenders as m, i (m.username)}
											<tr>
												<td><b>{i + 1}. <a class="mlink" href="/admin/crm/member?u={encodeURIComponent(m.username)}">{m.fullName}</a></b><span>@{m.username}</span></td>
												<td>{outletName(m.outletCode)}</td>
												<td class="r">{num(m.visits)}</td>
												<td class="r">{rp(m.total)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</article>

					<article class="card">
						<h2>Win back <small>no visit in 30+ days, biggest spenders first</small></h2>
						{#if data.segments.atRisk.length === 0}
							<p class="empty">Nobody has gone quiet. 🎉</p>
						{:else}
							<div class="scroll">
								<table>
									<thead><tr><th>Member</th><th class="r">Last visit</th><th class="r">Spent</th><th></th></tr></thead>
									<tbody>
										{#each data.segments.atRisk as m (m.username)}
											{@const link = wa(m.whatsapp, `Halo ${m.fullName.split(' ')[0]}, kami kangen nih di Solusi Kopi ☕ Mampir lagi yuk, ada stamp dan reward yang menunggu di Solu Club.`)}
											<tr>
												<td><b><a class="mlink" href="/admin/crm/member?u={encodeURIComponent(m.username)}">{m.fullName}</a></b><span>@{m.username}</span></td>
												<td class="r">{m.daysSince} days<span>{ago(m.lastVisit)}</span></td>
												<td class="r">{rp(m.total)}</td>
												<td class="r">{#if link}<a class="wa" href={link} target="_blank" rel="noopener">WhatsApp</a>{:else}<span>no number</span>{/if}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</article>
				</section>

				<section class="card">
					<h2>Birthdays in {monthName}</h2>
					{#if data.segments.birthdays.length === 0}
						<p class="empty">No birthdays this month.</p>
					{:else}
						<ul class="chips">
							{#each data.segments.birthdays as m (m.username)}
								{@const link = wa(m.whatsapp, `Selamat ulang tahun ${m.fullName.split(' ')[0]}! 🎂 Ada kejutan kecil dari Solusi Kopi untukmu, tunjukkan pesan ini ke barista ya.`)}
								<li>
									<b>{m.day} {monthName.slice(0, 3)}</b>
									<span>{m.fullName}</span>
									{#if link}<a class="wa" href={link} target="_blank" rel="noopener">WhatsApp</a>{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>
		{:else if loading}
			<p class="loading">Loading the dashboard…</p>
		{/if}
	</div>
{/if}

<style>
	.page {
		max-width: 1180px;
		margin: 0 auto;
		padding: 28px 24px 56px;
	}
	.top {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 22px;
	}
	.back {
		font-size: 12px;
		font-weight: 600;
		color: var(--copper-soft);
		text-decoration: none;
	}
	h1 {
		margin: 6px 0 2px;
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.sub {
		margin: 10px 0 0;
		font-size: 12px;
		color: var(--text-3);
	}
	.range {
		display: flex;
		gap: 6px;
	}
	.range button {
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
	.range button.on {
		background: var(--grad-primary);
		border-color: transparent;
		color: #fff;
	}
	.range .refresh {
		width: 36px;
		padding: 0;
		font-size: 16px;
	}
	.alert {
		margin-bottom: 16px;
		padding: 12px 16px;
		border-radius: 12px;
		border: 1px solid var(--error);
		color: var(--error);
		font-size: 13px;
		font-weight: 600;
	}
	.loading {
		color: var(--text-3);
		font-size: 14px;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 16px;
		transition: opacity 0.15s;
	}
	.body.dim {
		opacity: 0.55;
	}

	.kpis {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 12px;
	}
	.kpi,
	.card {
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: var(--surface);
	}
	.kpi {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 16px;
		min-width: 0;
	}
	.k {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--copper-soft);
	}
	.kpi b {
		font-size: 26px;
		font-weight: 800;
		line-height: 32px;
	}
	.note {
		font-size: 11px;
		color: var(--text-3);
	}
	.note.up {
		color: var(--success);
	}
	.note.down {
		color: var(--error);
	}

	.grid {
		display: grid;
		gap: 16px;
	}
	.grid.two {
		grid-template-columns: 1fr 1fr;
	}
	.card {
		padding: 18px 18px 16px;
		min-width: 0;
	}
	h2 {
		margin: 0 0 14px;
		font-size: 14px;
		font-weight: 800;
	}
	h2 small {
		margin-left: 6px;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-3);
	}

	.bars {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 150px;
	}
	.bars.small {
		height: 100px;
	}
	.bar {
		flex: 1;
		min-width: 1px;
		border-radius: 2px 2px 0 0;
		background: var(--copper);
	}
	.bar.alt {
		background: var(--copper-light);
	}
	.axis {
		display: flex;
		justify-content: space-between;
		margin-top: 6px;
		font-size: 10px;
		color: var(--text-3);
	}
	.hint {
		margin: 12px 0 0;
		font-size: 12px;
		color: var(--text-2);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.hrow {
		display: grid;
		grid-template-columns: minmax(120px, 170px) 1fr auto;
		align-items: center;
		gap: 12px;
	}
	.hl {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.hl b {
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
		min-width: 52px;
		text-align: right;
		font-size: 13px;
	}

	.stack {
		display: flex;
		height: 16px;
		gap: 2px;
		border-radius: 999px;
		overflow: hidden;
	}
	.stack i,
	.legend i {
		display: block;
	}
	.stack i {
		flex-basis: 0;
	}
	.a {
		background: var(--success);
	}
	.b {
		background: var(--copper);
	}
	.c {
		background: rgba(255, 255, 255, 0.35);
	}
	.d {
		background: var(--copper-light);
	}
	.legend {
		margin: 14px 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.legend li {
		display: grid;
		grid-template-columns: 10px 1fr auto;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		color: var(--text-2);
	}
	.legend li i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.legend b {
		color: #fff;
	}

	.mini {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-bottom: 16px;
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
	.mini b.warn {
		color: var(--error);
	}
	.mini span {
		font-size: 10px;
		color: var(--text-3);
	}

	.scroll {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}
	th {
		padding: 0 8px 8px;
		text-align: left;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--copper-soft);
		white-space: nowrap;
	}
	td {
		padding: 9px 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		vertical-align: top;
		white-space: nowrap;
	}
	td b {
		display: block;
		font-size: 12px;
	}
	td span {
		display: block;
		font-size: 10px;
		color: var(--text-3);
	}
	.r {
		text-align: right;
	}
	.empty {
		margin: 0;
		font-size: 13px;
		color: var(--text-3);
	}
	.mlink {
		color: inherit;
		text-decoration: none;
	}
	.mlink:hover {
		color: var(--copper-light);
		text-decoration: underline;
	}
	.wa {
		display: inline-block;
		padding: 5px 10px;
		border-radius: 999px;
		border: 1px solid var(--copper);
		color: var(--copper-light);
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
	}
	.chips {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.chips li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		font-size: 12px;
	}
	.chips b {
		color: var(--copper-light);
	}

	@media (max-width: 960px) {
		.kpis {
			grid-template-columns: repeat(3, 1fr);
		}
		.grid.two {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 560px) {
		.page {
			padding: 20px 16px 48px;
		}
		.kpis {
			grid-template-columns: repeat(2, 1fr);
		}
		.mini {
			grid-template-columns: repeat(2, 1fr);
		}
		.hrow {
			grid-template-columns: 1fr auto;
		}
		.hrow .track {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
</style>

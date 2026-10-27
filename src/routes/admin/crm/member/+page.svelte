<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { loyalty } from '#lib/services';
	import type { CrmMemberDetail, CrmMemberExtra, Reward } from '#lib/services/loyalty';
	import Columns from '#lib/components/crm/Columns.svelte';
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
	let x = $state<CrmMemberExtra | null>(null);
	let rewardList = $state<Reward[]>([]);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		const u = username;
		if (!session.user?.isAdmin || !u) return;
		loading = true;
		error = '';
		loyalty.crmMemberExtra(u).then((res) => (x = res)).catch(() => (x = null));
		loyalty.rewards().then((r) => (rewardList = r)).catch(() => (rewardList = []));
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

	const SOURCE_LABEL: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', friend: 'a friend', store_qr: 'the store QR', other: 'somewhere else' };
	const KIND: Record<string, string> = { visit: '#bd784e', voucher: '#7fb98a', redeem: '#8fb4d9', note: '#f2e8da', followup: '#e0b050', signup: '#d59b75' };
	const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
	const todayIso = new Date().toISOString().slice(0, 10);

	// ---- notes, follow-ups and tags
	let noteText = $state('');
	let noteDue = $state('');
	let tagText = $state('');
	let actErr = $state('');
	let actOk = $state('');
	let busy = $state(false);
	async function reloadExtra() {
		if (username) x = await loyalty.crmMemberExtra(username);
	}
	async function guarded(fn: () => Promise<void>, ok = '') {
		actErr = '';
		actOk = '';
		busy = true;
		try {
			await fn();
			actOk = ok;
		} catch (e) {
			actErr = e instanceof Error ? e.message : 'Something went wrong.';
		} finally {
			busy = false;
		}
	}
	const addNote = () =>
		guarded(async () => {
			if (!noteText.trim()) throw new Error('Write the note first.');
			await loyalty.crmAddNote(username, noteText.trim(), noteDue || null);
			noteText = '';
			noteDue = '';
			await reloadExtra();
		});
	const toggleNote = (id: string, done: boolean) => guarded(async () => { await loyalty.crmSetNoteDone(id, done); await reloadExtra(); });
	const removeNote = (id: string) => guarded(async () => { await loyalty.crmDeleteNote(id); await reloadExtra(); });
	const addTag = () =>
		guarded(async () => {
			const t = tagText.trim().toLowerCase();
			if (!t) return;
			if (!/^[a-z0-9][a-z0-9 _-]{0,23}$/.test(t)) throw new Error('Tags use letters, numbers, spaces, - or _ (max 24).');
			await loyalty.crmSetTags(username, [...new Set([...(x?.tags ?? []), t])]);
			tagText = '';
			await reloadExtra();
		});
	const dropTag = (t: string) => guarded(async () => { await loyalty.crmSetTags(username, (x?.tags ?? []).filter((y) => y !== t)); await reloadExtra(); });

	// ---- admin actions (each one needs a reason and lands in the audit log)
	let beansAmt = $state('');
	let beansWhy = $state('');
	let giftReward = $state('');
	let giftWhy = $state('');
	const grantBeans = () =>
		guarded(async () => {
			const n = Number(beansAmt.replace(/[^\d-]/g, ''));
			if (!n) throw new Error('Enter how many beans (use a minus to take some back).');
			if (beansWhy.trim().length < 3) throw new Error('Write a short reason.');
			if (!confirm(`${n > 0 ? 'Give' : 'Take back'} ${Math.abs(n)} beans ${n > 0 ? 'to' : 'from'} @${username}?`)) return;
			const bal = await loyalty.crmGrantBeans(username, n, beansWhy.trim());
			beansAmt = '';
			beansWhy = '';
			d = await loyalty.crmMember(username);
			actOk = `Done. They now have ${bal} beans.`;
		});
	const grantVoucher = () =>
		guarded(async () => {
			if (!giftReward) throw new Error('Choose a reward.');
			if (giftWhy.trim().length < 3) throw new Error('Write a short reason.');
			const name = rewardList.find((r) => r.id === giftReward)?.name ?? 'this reward';
			if (!confirm(`Gift "${name}" to @${username}?`)) return;
			await loyalty.crmGrantVoucher(username, giftReward, giftWhy.trim());
			giftReward = '';
			giftWhy = '';
			d = await loyalty.crmMember(username);
			actOk = 'Voucher added to their rewards.';
		});
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
							{#if x}
								<span class="crm-chip" class:ok={x.optIn} class:mute={!x.optIn}>{x.optIn ? 'Agreed to promos' : 'No promo opt-in'}</span>
								{#if x.signupSource}<span class="crm-chip mute">Found us via {SOURCE_LABEL[x.signupSource] ?? x.signupSource}</span>{/if}
								{#each x.tags as t (t)}<span class="crm-chip">{t}</span>{/each}
							{/if}
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
												<td>{v.source === 'gift' ? 'Gift' : v.source === 'stamp' ? `Stamp ${v.detail}` : `${v.detail} beans`}</td>
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

				{#if x}
					<section class="crm-kpis four" aria-label="Predictions">
						<div class="crm-kpi"><span class="k">Spend percentile</span><b>Top {Math.max(1, 100 - x.percentile.spend)}%</b><span class="note">of {x.percentile.members} buyers</span></div>
						<div class="crm-kpi"><span class="k">Visit percentile</span><b>Top {Math.max(1, 100 - x.percentile.visits)}%</b><span class="note">by number of visits</span></div>
						<div class="crm-kpi"><span class="k">Next visit (est.)</span><b>{x.predictedNextVisit ? new Date(x.predictedNextVisit + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</b><span class="note">{x.predictedNextVisit ? (x.predictedNextVisit < todayIso ? 'overdue against their usual rhythm' : 'from their usual rhythm') : 'needs 3 or more visits'}</span></div>
						<div class="crm-kpi"><span class="k">12-month value</span><b>{x.clv12 ? short(x.clv12) : '—'}</b><span class="note">if they keep the current pace</span></div>
					</section>

					<section class="crm-grid2">
						<article class="crm-card">
							<h2>Ticket size <small>last {x.ticketTrend.length} purchases</small></h2>
							{#if x.ticketTrend.length > 1}
								<LineChart points={x.ticketTrend.map((t) => ({ label: when(t.d), v: t.amount }))} format={short} height={190} />
							{:else}
								<p class="crm-empty">Needs at least two purchases.</p>
							{/if}
						</article>
						<article class="crm-card">
							<h2>Favorite menu</h2>
							{#if x.favoriteMenu.length}
								<Columns items={x.favoriteMenu.map((m) => ({ label: m.name, n: m.qty }))} height={130} />
								<p class="cap">Based only on purchases where the cashier ticked items.</p>
							{:else}
								<p class="crm-empty">No items recorded for this member yet. They appear once the cashier ticks what was ordered.</p>
							{/if}
						</article>
					</section>

					<section class="crm-grid2">
						<article class="crm-card">
							<h2>Timeline</h2>
							<ul class="tl">
								{#each x.timeline as e, i (i)}
									<li><i style:background={KIND[e.kind]}></i><div><b>{e.text}</b><span>{when(e.at)}</span></div></li>
								{/each}
							</ul>
						</article>
						<article class="crm-card">
							<h2>Members like this one</h2>
							{#if x.lookalikes.length === 0}
								<p class="crm-empty">Nobody to compare with yet.</p>
							{:else}
								<ul class="tl">
									{#each x.lookalikes as l (l.username)}
										<li><i></i><div><a href="/admin/crm/member?u={encodeURIComponent(l.username)}"><b>{l.fullName}</b></a><span>@{l.username} · {short(l.total)} · {l.visits} visits</span></div></li>
									{/each}
								</ul>
								<p class="cap">Closest in total spend and number of visits. Useful for "people like her also liked…" ideas.</p>
							{/if}
						</article>
					</section>

					<section class="crm-grid2">
						<article class="crm-card">
							<h2>Notes and follow-ups</h2>
							<div class="form">
								<textarea rows="2" placeholder="e.g. Prefers oat milk. Ask about the catering order." bind:value={noteText}></textarea>
								<div class="inline">
									<label>Follow up on <input type="date" min={todayIso} bind:value={noteDue} /></label>
									<button type="button" class="act" disabled={busy} onclick={addNote}>Add</button>
								</div>
							</div>
							{#if x.notes.length === 0}
								<p class="crm-empty">No notes yet.</p>
							{:else}
								<ul class="notes">
									{#each x.notes as n (n.id)}
										<li class:done={n.done}>
											<div>
												<p>{n.body}</p>
												<span>{when(n.createdAt)}{n.author ? ' · @' + n.author : ''}{n.dueOn ? ' · follow up ' + when(n.dueOn) : ''}</span>
											</div>
											<div class="nb">
												{#if n.dueOn}<button type="button" onclick={() => toggleNote(n.id, !n.done)}>{n.done ? 'Reopen' : 'Done'}</button>{/if}
												<button type="button" onclick={() => removeNote(n.id)}>Delete</button>
											</div>
										</li>
									{/each}
								</ul>
							{/if}
						</article>

						<article class="crm-card">
							<h2>Tags</h2>
							<div class="tags">
								{#each x.tags as t (t)}<span class="crm-chip">{t} <button type="button" class="x" aria-label="Remove {t}" onclick={() => dropTag(t)}>×</button></span>{/each}
								{#if x.tags.length === 0}<span class="crm-empty">No tags.</span>{/if}
							</div>
							<div class="inline">
								<input class="txt" placeholder="vip, mahasiswa, catering…" bind:value={tagText} onkeydown={(e) => e.key === 'Enter' && addTag()} />
								<button type="button" class="act" disabled={busy} onclick={addTag}>Add tag</button>
							</div>

							<h2 class="sp">Give something</h2>
							<div class="form">
								<div class="inline">
									<input class="txt" inputmode="numeric" placeholder="Beans (e.g. 50 or -50)" bind:value={beansAmt} />
									<input class="txt wide" placeholder="Reason" bind:value={beansWhy} />
									<button type="button" class="act" disabled={busy} onclick={grantBeans}>Adjust beans</button>
								</div>
								<div class="inline">
									<select class="txt" bind:value={giftReward}>
										<option value="">Gift a reward…</option>
										{#each rewardList as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
									</select>
									<input class="txt wide" placeholder="Reason" bind:value={giftWhy} />
									<button type="button" class="act" disabled={busy} onclick={grantVoucher}>Gift</button>
								</div>
								<p class="cap">Both are written to the Audit log with your name and the reason.</p>
							</div>
							{#if actErr}<div class="crm-alert" role="alert">{actErr}</div>{/if}
							{#if actOk}<p class="okmsg" role="status">{actOk}</p>{/if}
						</article>
					</section>
				{:else}
					<section class="crm-card nodata">
						<h2>More about this member</h2>
						<p class="cap">The extra details (notes, tags, predictions, favorite menu) need the newest database update. Run supabase/009 and 010 in the SQL editor.</p>
					</section>
				{/if}
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
	.crm-kpis.four {
		grid-template-columns: repeat(4, 1fr);
	}
	.form {
		display: grid;
		gap: 8px;
		margin-bottom: 12px;
	}
	.form textarea,
	.txt {
		padding: 8px 12px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
		font-size: 12px;
		font-family: inherit;
		color-scheme: dark;
	}
	.txt {
		height: 36px;
		min-width: 120px;
	}
	.txt.wide {
		flex: 1;
	}
	.inline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.inline label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--text-3);
	}
	.inline input[type='date'] {
		height: 34px;
		padding: 0 8px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
		color-scheme: dark;
	}
	.act {
		height: 36px;
		padding: 0 16px;
		border: 0;
		border-radius: 999px;
		background: var(--grad-primary);
		color: #fff;
		font-size: 12px;
		font-weight: 800;
		cursor: pointer;
	}
	.act:disabled {
		opacity: 0.5;
	}
	.notes {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.notes li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
	}
	.notes li.done p {
		text-decoration: line-through;
		color: var(--text-3);
	}
	.notes p {
		margin: 0 0 4px;
		font-size: 12px;
		line-height: 18px;
	}
	.notes span {
		font-size: 10px;
		color: var(--text-3);
	}
	.nb {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.nb button,
	.x {
		background: none;
		border: 0;
		color: var(--copper-light);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}
	.x {
		font-size: 13px;
		padding: 0 0 0 4px;
	}
	.sp {
		margin-top: 22px !important;
	}
	.okmsg {
		margin: 8px 0 0;
		font-size: 12px;
		font-weight: 600;
		color: var(--success);
	}
	@media (max-width: 960px) {
		.crm-kpis.four {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>

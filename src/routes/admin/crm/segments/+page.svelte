<script lang="ts">
	import { goto } from '$app/navigation';
	import { loyalty } from '#lib/services';
	import type { CrmSegmentRow, SegmentKey } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';
	import { crmFilter } from '#lib/stores/crmFilter.svelte';
	import { downloadCsv } from '#lib/csv';
	import CrmTabs from '#lib/components/crm/CrmTabs.svelte';
	import FilterBar from '#lib/components/crm/FilterBar.svelte';
	import Donut from '#lib/components/crm/Donut.svelte';
	import Heatmap from '#lib/components/crm/Heatmap.svelte';
	import { rp, short } from '#lib/components/crm/palette';
	import '#lib/components/crm/crm.css';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	const SEGMENTS: Record<SegmentKey, { label: string; color: string; hint: string; msg: string }> = {
		champion: { label: 'Champions', color: '#7fb98a', hint: 'Come often, spend well, visited recently.', msg: 'Hi {name}! You are one of our most loyal Solu Club members, and we wanted to say thank you. Show this message at the counter for a little something on us.' },
		loyal: { label: 'Loyal', color: '#bd784e', hint: 'Come regularly.', msg: 'Hi {name}! Thanks for always stopping by Solu. Try our new menu this week, we think you will like it.' },
		big_spender: { label: 'Big spenders', color: '#f2e8da', hint: 'Spend a lot per visit but not often.', msg: 'Hi {name}! We saved a seat for you at Solu. Come by this week and bring a friend, the second drink is on us.' },
		promising: { label: 'Promising', color: '#8fb4d9', hint: 'New and recent, not yet regular.', msg: 'Hi {name}! Welcome to Solu Club. Collect your next stamp this week and you are one step closer to a free drink.' },
		attention: { label: 'Needs attention', color: '#d59b75', hint: 'Middle of the road.', msg: 'Hi {name}! It has been a little while. Come by Solu this week, we have something new for you.' },
		at_risk: { label: 'At risk', color: '#e0b050', hint: 'Used to come often, gone quiet.', msg: 'Hi {name}, we miss you at Solu! Come back this week and show this message for a free upgrade on your drink.' },
		hibernating: { label: 'Hibernating', color: '#e08a78', hint: 'Long gone and low activity.', msg: 'Hi {name}! It has been a while. A free drink is waiting for you at Solu whenever you are ready to come back.' },
		new: { label: 'No visit yet', color: '#8a8a8a', hint: 'Signed up, never bought.', msg: 'Hi {name}! Your Solu Club card is ready. Your first stamp is waiting, come by and say hi.' }
	};
	const ORDER: SegmentKey[] = ['champion', 'loyal', 'big_spender', 'promising', 'attention', 'at_risk', 'hibernating', 'new'];

	let rows = $state<CrmSegmentRow[]>([]);
	let loading = $state(false);
	let error = $state('');

	let seg = $state<SegmentKey | ''>('');
	let q = $state('');
	let optOnly = $state(false);
	let tagFilter = $state('');
	let minRisk = $state(0);
	let sortBy = $state<'total' | 'churnRisk' | 'clv12' | 'daysSince' | 'visits'>('total');

	async function load() {
		loading = true;
		error = '';
		try {
			rows = await loyalty.crmSegments(crmFilter.outlet || null);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load the segments.';
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		if (session.user?.isAdmin) load();
	});

	const counts = $derived(
		ORDER.map((k) => {
			const list = rows.filter((r) => r.segment === k);
			return { key: k, n: list.length, revenue: list.reduce((a, r) => a + r.total, 0), risk: list.length ? Math.round(list.reduce((a, r) => a + r.churnRisk, 0) / list.length) : 0 };
		})
	);
	const allTags = $derived([...new Set(rows.flatMap((r) => r.tags))].sort());
	const shown = $derived(
		rows
			.filter((r) => !seg || r.segment === seg)
			.filter((r) => !optOnly || r.optIn)
			.filter((r) => !tagFilter || r.tags.includes(tagFilter))
			.filter((r) => r.churnRisk >= minRisk)
			.filter((r) => {
				const s = q.trim().toLowerCase();
				return !s || r.username.toLowerCase().includes(s) || r.fullName.toLowerCase().includes(s);
			})
			.sort((a, b) => ((b[sortBy] ?? -1) as number) - ((a[sortBy] ?? -1) as number))
			.slice(0, 400)
	);
	// Recency (rows, top = most recent) against frequency (columns): how many members sit in each cell.
	const matrix = $derived(
		[5, 4, 3, 2, 1].map((r) => [1, 2, 3, 4, 5].map((f) => rows.filter((x) => x.visits > 0 && x.r === r && x.f === f).length))
	);
	const eligible = (r: CrmSegmentRow) => r.optIn && !!r.whatsapp;

	// ------------------------------------------------------------------ campaign
	let picked = $state<Record<string, boolean>>({});
	const chosen = $derived(rows.filter((r) => picked[r.username] && eligible(r)));
	let cname = $state('');
	let cmsg = $state('');
	let creating = $state(false);
	let cerr = $state('');
	const campaignSegment = $derived(seg || null);

	function pickAllShown() {
		for (const r of shown) if (eligible(r)) picked[r.username] = true;
		prefill();
	}
	function clearPicked() {
		picked = {};
	}
	function prefill() {
		if (!cname) cname = (seg ? SEGMENTS[seg].label : 'Campaign') + ' · ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
		if (!cmsg) cmsg = seg ? SEGMENTS[seg].msg : 'Hi {name}! ';
	}
	async function createCampaign() {
		cerr = '';
		if (!cname.trim() || !cmsg.trim()) return (cerr = 'Give the campaign a name and a message.');
		if (chosen.length === 0) return (cerr = 'Pick at least one member who agreed to promos.');
		creating = true;
		try {
			const res = await loyalty.crmCreateCampaign(cname.trim(), cmsg.trim(), campaignSegment, chosen.map((r) => r.username));
			await goto('/admin/crm/campaigns?id=' + encodeURIComponent(res.id));
		} catch (e) {
			cerr = e instanceof Error ? e.message : 'Could not create the campaign.';
		} finally {
			creating = false;
		}
	}

	function exportCsv() {
		downloadCsv(
			`solu-club-members-${new Date().toISOString().slice(0, 10)}.csv`,
			['username', 'name', 'outlet', 'segment', 'visits', 'total_rp', 'avg_ticket_rp', 'last_visit', 'days_since', 'churn_risk', 'next_visit', 'clv_12m_rp', 'promo_opt_in', 'tags'],
			shown.map((r) => [r.username, r.fullName, r.outletCode, SEGMENTS[r.segment].label, r.visits, r.total, r.avgTicket, r.lastVisit?.slice(0, 10), r.daysSince, r.churnRisk, r.nextVisit, r.clv12, r.optIn ? 'yes' : 'no', r.tags.join(' ')])
		);
	}
	const riskColor = (n: number) => (n >= 70 ? 'var(--error)' : n >= 40 ? '#e0b050' : 'var(--success)');
</script>

{#if session.user?.isAdmin}
	<div class="crm-page">
		<header class="crm-top">
			<div>
				<a class="back" href="/admin">‹ Back to admin</a>
				<h1>Segments</h1>
				<CrmTabs active="segments" />
				<p class="sub">Members grouped by how recently, how often and how much they buy (RFM). Churn risk is a simple estimate: how overdue someone is compared with their own usual rhythm.</p>
			</div>
			<div class="actions">
				<FilterBar range={false} onchange={load} />
				<button type="button" class="ghost" onclick={exportCsv} disabled={!shown.length}>Export CSV ({shown.length})</button>
			</div>
		</header>

		{#if error}<div class="crm-alert" role="alert">{error}</div>{/if}

		<div class="crm-stack" class:dim={loading}>
			<section class="crm-grid2">
				<article class="crm-card">
					<h2>Segments</h2>
					<Donut
						segments={counts.filter((c) => c.n > 0).map((c) => ({ label: SEGMENTS[c.key].label, value: c.n, color: SEGMENTS[c.key].color }))}
						big={String(rows.length)}
						small="members"
					/>
				</article>
				<article class="crm-card">
					<h2>Recency × frequency <small>members per cell</small></h2>
					<Heatmap rows={['Recent', 'R4', 'R3', 'R2', 'Long ago']} cols={['Rare', 'F2', 'F3', 'F4', 'Often']} data={matrix} showValues cell={46} />
					<p class="cap">Top right is where your best members live. Bottom right (often, but long ago) is the group worth a win-back message.</p>
				</article>
			</section>

			<section class="chips" aria-label="Pick a segment">
				<button type="button" class:on={seg === ''} onclick={() => (seg = '')}>All <b>{rows.length}</b></button>
				{#each counts as c (c.key)}
					<button type="button" class:on={seg === c.key} onclick={() => (seg = seg === c.key ? '' : c.key)} title={SEGMENTS[c.key].hint}>
						<i style:background={SEGMENTS[c.key].color}></i>{SEGMENTS[c.key].label} <b>{c.n}</b>
					</button>
				{/each}
			</section>

			<article class="crm-card">
				<div class="tools">
					<input class="search" placeholder="Search name or username" bind:value={q} />
					<label class="chk"><input type="checkbox" bind:checked={optOnly} /> Agreed to promos</label>
					<label class="sel"><span>Tag</span>
						<select bind:value={tagFilter}><option value="">Any</option>{#each allTags as t (t)}<option value={t}>{t}</option>{/each}</select>
					</label>
					<label class="sel"><span>Churn risk at least</span>
						<select bind:value={minRisk}><option value={0}>Any</option><option value={40}>40+</option><option value={70}>70+</option></select>
					</label>
					<label class="sel"><span>Sort by</span>
						<select bind:value={sortBy}>
							<option value="total">Total spent</option><option value="churnRisk">Churn risk</option><option value="clv12">Value (12 months)</option>
							<option value="daysSince">Days since last visit</option><option value="visits">Visits</option>
						</select>
					</label>
					<button type="button" class="ghost" onclick={pickAllShown}>Select everyone who agreed</button>
				</div>

				{#if seg}<p class="cap">{SEGMENTS[seg].label}: {SEGMENTS[seg].hint}</p>{/if}

				<div class="crm-scroll">
					<table class="crm-table">
						<thead>
							<tr><th></th><th>Member</th><th>Segment</th><th class="r">Visits</th><th class="r">Spent</th><th>Last visit</th><th>Churn risk</th><th>Next visit (est.)</th><th class="r">12-month value</th><th>Tags</th></tr>
						</thead>
						<tbody>
							{#each shown as r (r.username)}
								<tr class="link" onclick={() => goto('/admin/crm/member?u=' + encodeURIComponent(r.username))}>
									<td onclick={(e) => e.stopPropagation()}>
										<input type="checkbox" checked={!!picked[r.username]} disabled={!eligible(r)} title={eligible(r) ? 'Add to the campaign' : r.optIn ? 'No WhatsApp number' : 'Did not agree to promos'} onchange={(e) => { picked[r.username] = e.currentTarget.checked; prefill(); }} />
									</td>
									<td><b>{r.fullName}</b><span>@{r.username}{r.outletCode ? ' · ' + r.outletCode : ''}</span></td>
									<td><span class="crm-chip" style:color={SEGMENTS[r.segment].color}>{SEGMENTS[r.segment].label}</span><span class="rfm">R{r.r} F{r.f} M{r.m}</span></td>
									<td class="r">{r.visits}</td>
									<td class="r">{short(r.total)}</td>
									<td>{r.daysSince === null ? '–' : r.daysSince === 0 ? 'today' : r.daysSince === 1 ? 'yesterday' : r.daysSince + ' days ago'}</td>
									<td>
										{#if r.visits > 0}
											<span class="risk"><i style:width="{r.churnRisk}%" style:background={riskColor(r.churnRisk)}></i></span><span class="rn">{r.churnRisk}</span>
										{:else}–{/if}
									</td>
									<td>{r.nextVisit ? new Date(r.nextVisit + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–'}</td>
									<td class="r">{r.clv12 ? short(r.clv12) : '–'}</td>
									<td>{#each r.tags as t (t)}<span class="crm-chip">{t}</span> {/each}{#if r.openFollowups}<span class="crm-chip bad">{r.openFollowups} follow-up</span>{/if}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if shown.length === 0}<p class="crm-empty">No members match these filters.</p>{/if}
			</article>

			{#if Object.values(picked).some(Boolean)}
				<aside class="dock" aria-label="Campaign">
					<div class="dock-in">
						<div class="dh"><b>WhatsApp campaign · {chosen.length} {chosen.length === 1 ? 'member' : 'members'}</b><button type="button" class="ghost" onclick={clearPicked}>Clear</button></div>
						<input class="search" placeholder="Campaign name" bind:value={cname} />
						<textarea rows="3" placeholder="Message. {'{name}'} becomes the member's first name." bind:value={cmsg}></textarea>
						{#if cerr}<div class="crm-alert" role="alert">{cerr}</div>{/if}
						<button type="button" class="go" disabled={creating || chosen.length === 0} onclick={createCampaign}>{creating ? 'Creating…' : 'Create campaign'}</button>
						<small>Nothing is sent automatically. You tap each WhatsApp link yourself, and the campaign page then tracks who came back within 14 days.</small>
					</div>
				</aside>
			{/if}
		</div>
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
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chips button {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 34px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--text-2);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.chips button.on {
		border-color: var(--copper);
		background: rgba(189, 120, 78, 0.2);
		color: #fff;
	}
	.chips i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
	}
	.chips b {
		color: var(--copper-light);
	}
	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 12px;
		margin-bottom: 14px;
	}
	.search,
	textarea {
		padding: 0 12px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
		font-size: 13px;
	}
	.search {
		height: 36px;
		min-width: 200px;
	}
	textarea {
		padding: 10px 12px;
		resize: vertical;
		font-family: inherit;
	}
	.chk {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		font-size: 12px;
		color: var(--text-2);
	}
	.sel {
		display: grid;
		gap: 3px;
	}
	.sel span {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--copper-soft);
	}
	.sel select {
		height: 36px;
		padding: 0 10px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
		font-size: 12px;
		color-scheme: dark;
	}
	.rfm {
		margin-top: 3px;
		font-size: 10px;
		color: var(--text-3);
	}
	.risk {
		display: inline-block;
		width: 64px;
		height: 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
		vertical-align: middle;
	}
	.risk i {
		display: block;
		height: 100%;
	}
	.rn {
		display: inline-block;
		margin-left: 6px;
		font-size: 11px;
		font-weight: 700;
	}
	.dock {
		position: sticky;
		bottom: 12px;
		z-index: 5;
	}
	.dock-in {
		display: grid;
		gap: 10px;
		max-width: 640px;
		margin: 0 auto;
		padding: 16px;
		border-radius: 18px;
		border: 1px solid var(--copper);
		background: rgba(14, 10, 8, 0.97);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
	}
	.dh {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
	}
	.dock small {
		font-size: 11px;
		line-height: 16px;
		color: var(--text-3);
	}
	.go {
		height: 42px;
		border: 0;
		border-radius: 999px;
		background: var(--grad-primary);
		color: #fff;
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
	}
	.go:disabled {
		opacity: 0.5;
	}
</style>

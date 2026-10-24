<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import { cardFill, monthLabel, rp, whenLabel } from '#lib/format';
	import { loyalty } from '#lib/services';
	import type { Balance, LedgerEntry, Voucher } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});

	let balance = $state<Balance>({ stamps: 0, beans: 0, lifetimeBeans: 0 });
	let entries = $state<LedgerEntry[]>([]);
	let vouchers = $state<Voucher[]>([]);
	let loaded = $state(false);
	let tab = $state<'all' | 'earned' | 'redeemed'>('all');
	$effect(() => {
		if (!session.user) return;
		Promise.all([loyalty.balance(), loyalty.ledger(), loyalty.vouchers()]).then(([b, l, v]) => {
			balance = b;
			entries = l;
			vouchers = v;
			loaded = true;
		});
	});

	const fill = $derived(cardFill(balance.stamps));
	const left = $derived(fill >= 10 ? 0 : 10 - fill);
	const redeemed = $derived(balance.lifetimeBeans - balance.beans);

	// "Stamp 7 of 10": number each stamp in the order it was collected.
	const stampNo = $derived.by(() => {
		const map = new Map<string, number>();
		let n = 0;
		for (const e of [...entries].reverse()) if (e.kind === 'stamp' && e.delta > 0) map.set(e.id, ++n);
		return map;
	});

	interface Row {
		id: string;
		icon: IconName;
		title: string;
		sub: string;
		amount: string;
		out: boolean;
		month: string;
		at: string;
	}
	function toRow(e: LedgerEntry): Row {
		const when = whenLabel(e.createdAt);
		const base = { id: e.id, at: e.createdAt, month: monthLabel(e.createdAt), out: e.delta < 0 };
		if (e.kind === 'beans' && e.delta > 0)
			return { ...base, icon: 'bean', title: 'Beans earned', sub: `${e.amountRp ? `Purchase ${rp(e.amountRp)}` : 'Bonus'} · ${when}`, amount: `+${e.delta} beans` };
		if (e.kind === 'beans')
			return { ...base, icon: 'bean', title: 'Beans redeemed', sub: when, amount: `−${Math.abs(e.delta)} beans` };
		if (e.delta > 0)
			return { ...base, icon: 'plus', title: 'Stamp collected', sub: `Stamp ${cardFill(stampNo.get(e.id) ?? 0)} of 10 · ${when}`, amount: `+${e.delta} stamp` };
		return { ...base, icon: 'gift', title: 'Stamp adjustment', sub: when, amount: `${e.delta} stamp` };
	}
	// Rewards show up here too: when unlocked from stamps, and when used at the counter.
	function voucherRows(): Row[] {
		const out: Row[] = [];
		for (const v of vouchers) {
			if (v.source === 'stamp')
				out.push({ id: v.id + 'u', at: v.createdAt, month: monthLabel(v.createdAt), out: false, icon: 'gift', title: 'Reward unlocked', sub: `${v.rewardName} · ${whenLabel(v.createdAt)}`, amount: `Stamp ${v.sourceDetail}` });
			if (v.status === 'used' && v.usedAt)
				out.push({ id: v.id + 'x', at: v.usedAt, month: monthLabel(v.usedAt), out: true, icon: 'gift', title: 'Reward used', sub: `${v.rewardName} · ${whenLabel(v.usedAt)}`, amount: 'Used' });
		}
		return out;
	}
	const rows = $derived(
		[
			...entries.filter((e) => (tab === 'all' ? true : tab === 'earned' ? e.delta > 0 : e.delta < 0)).map(toRow),
			...(tab === 'all' ? voucherRows() : [])
		].sort((a, b) => b.at.localeCompare(a.at))
	);
	const groups = $derived.by(() => {
		const out: { month: string; rows: Row[] }[] = [];
		for (const r of rows) {
			const g = out.at(-1);
			if (g && g.month === r.month) g.rows.push(r);
			else out.push({ month: r.month, rows: [r] });
		}
		return out;
	});
</script>

{#if session.user}
	<AppScreen>
		<div class="page">
			<header>
				<a class="back" href="/home" aria-label="Back">←</a>
				<h1>Beans</h1>
			</header>

			<div class="stats">
				<div class="st">
					<small>STAMPS</small>
					<div class="big">{fill}<span> / 10</span></div>
					<div class="bar"><i style:width="{fill * 10}%"></i></div>
					<p>{left === 0 ? 'Card complete' : `${left} more for a free drink`}</p>
				</div>
				<div class="st">
					<small>BEANS</small>
					<div class="big">{balance.beans.toLocaleString('id-ID')}<span> beans</span></div>
					<p>Earned {balance.lifetimeBeans.toLocaleString('id-ID')} · Redeemed {redeemed.toLocaleString('id-ID')}</p>
				</div>
			</div>

			<div class="tabs" role="tablist">
				{#each [['all', 'All'], ['earned', 'Earned'], ['redeemed', 'Redeemed']] as [k, label] (k)}
					<button role="tab" aria-selected={tab === k} class:on={tab === k} onclick={() => (tab = k as typeof tab)}>{label}</button>
				{/each}
			</div>

			{#each groups as g (g.month)}
				<div class="month">{g.month}</div>
				<ul>
					{#each g.rows as r (r.id)}
						<li>
							<span class="ico" class:dim={r.out}><Icon name={r.icon} size={18} /></span>
							<div class="txt"><b>{r.title}</b><small>{r.sub}</small></div>
							<strong class:out={r.out}>{r.amount}</strong>
						</li>
					{/each}
				</ul>
			{:else}
				{#if loaded}
					{#if tab === 'redeemed'}
						<p class="empty">Nothing redeemed yet.</p>
					{:else}
						<div class="none">
							<span class="clock"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
							<b>No activity yet</b>
							<p>Show your QR at the cashier. Every purchase adds stamps and beans here.</p>
							<a class="qr" href="/card">Show my QR</a>
						</div>
					{/if}
				{/if}
			{/each}
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 24px 32px;
	}
	header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 40px;
	}
	.back {
		position: absolute;
		left: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: rgba(9, 7, 5, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		text-decoration: none;
	}
	h1 {
		margin: 0;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.04em;
	}
	.stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 30px;
	}
	.st {
		padding: 14px;
		border-radius: 14px;
		border: 1px solid rgba(189, 120, 78, 0.5);
		background: rgba(189, 120, 78, 0.07);
	}
	small {
		display: block;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
	}
	.big {
		margin-top: 8px;
		font-size: 30px;
		font-weight: 800;
		letter-spacing: -0.04em;
	}
	.big span {
		font-size: 12px;
		font-weight: 700;
		color: var(--copper-soft);
		letter-spacing: 0;
	}
	.bar {
		margin-top: 10px;
		height: 5px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.14);
		overflow: hidden;
	}
	.bar i {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, #83472c, #e0a073);
	}
	.st p {
		margin: 8px 0 0;
		font-size: 10px;
		color: var(--text-2);
	}
	.tabs {
		display: flex;
		margin-top: 20px;
		padding: 4px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	.tabs button {
		flex: 1;
		height: 36px;
		border: 0;
		border-radius: 30px;
		background: transparent;
		color: var(--text-2);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.tabs button.on {
		background: linear-gradient(90deg, #83472c, #a05a37);
		color: #fff;
	}
	.month {
		margin: 24px 0 4px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 60px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.ico {
		flex: none;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(189, 120, 78, 0.18);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ico.dim {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.7);
	}
	.txt {
		flex: 1;
		min-width: 0;
	}
	.txt b {
		display: block;
		font-size: 13px;
	}
	.txt small {
		margin-top: 3px;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0;
		color: var(--text-3);
	}
	li strong {
		font-size: 12px;
		color: var(--copper-light);
		white-space: nowrap;
	}
	li strong.out {
		color: #fff;
	}
	.empty {
		margin: 28px 4px;
		font-size: 12px;
		line-height: 18px;
		color: var(--text-3);
		text-align: center;
	}
	.none {
		margin-top: 48px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 10px;
	}
	.clock {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		border: 1px solid rgba(189, 120, 78, 0.7);
		background: rgba(189, 120, 78, 0.18);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
	}
	.none b {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.04em;
	}
	.none p {
		margin: 0;
		max-width: 260px;
		font-size: 13px;
		line-height: 20px;
		color: var(--text-2);
	}
	.qr {
		margin-top: 14px;
		width: 240px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		background: var(--grad-primary);
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
</style>

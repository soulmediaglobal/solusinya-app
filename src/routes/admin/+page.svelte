<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import Screen from '#lib/components/Screen.svelte';
	import Field from '#lib/components/Field.svelte';
	import Button from '#lib/components/Button.svelte';
	import { OUTLETS, type OutletCode } from '#lib/config';
	import { loyalty } from '#lib/services';
	import type { AdminTx, MemberLookup, MenuItem } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	// Admin only. Everyone else goes back to Home (the database enforces this too).
	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	let query = $state('');
	let amount = $state('');
	let outlet = $state<OutletCode>(untrack(() => (session.user?.outletCode ?? 'DRA') as OutletCode));
	let found = $state<MemberLookup | null>(null);
	let checked = $state(false);
	let busy = $state(false);
	let error = $state('');
	let done = $state('');
	let recent = $state<AdminTx[]>([]);
	let menu = $state<MenuItem[]>([]);
	let picked = $state<Record<string, number>>({});
	const items = $derived(Object.entries(picked).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty })));
	const bump = (id: string, by: number) => (picked[id] = Math.max(0, Math.min(99, (picked[id] ?? 0) + by)));
	$effect(() => {
		if (session.user?.isAdmin) loyalty.menuItems().then((m) => (menu = m.filter((x) => x.active))).catch(() => (menu = []));
	});

	const rp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
	const amountNum = $derived(Number(amount.replace(/\D/g, '')) || 0);
	const outletName = (c: string) => OUTLETS.find((o) => o.code === c)?.name ?? c;
	const when = (iso: string) =>
		new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

	async function refresh() {
		recent = await loyalty.recentTransactions(10);
	}
	$effect(() => {
		if (session.user?.isAdmin) refresh();
	});

	// Look the member up as the admin types, so a typo is caught before recording.
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const q = query;
		clearTimeout(timer);
		found = null;
		checked = false;
		done = '';
		if (q.trim().length < 3) return;
		timer = setTimeout(async () => {
			const m = await loyalty.findMember(q);
			if (q === query) {
				found = m;
				checked = true;
			}
		}, 300);
		return () => clearTimeout(timer);
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		done = '';
		if (!found) return (error = 'Find a member first.');
		if (amountNum <= 0) return (error = 'Enter the transaction amount.');
		busy = true;
		try {
			const res = await loyalty.recordTransaction(found.memberId, amountNum, outlet, items);
			done = `Recorded ${rp(amountNum)} for @${found.username}: +${res.stamps} stamp, +${res.beans} beans.` + (res.rewardUnlocked ? ` Reward unlocked: ${res.rewardUnlocked}.` : '');
			query = '';
			amount = '';
			picked = {};
			await refresh();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		} finally {
			busy = false;
		}
	}
</script>

{#if session.user?.isAdmin}
	<Screen back="/home" heroHeight={210} top={92}>
		<form onsubmit={submit} class="form" novalidate>
			<h1 class="title">Add transaction</h1>
			<Field label="Member ID or username" bind:value={query} placeholder="SK-DRA-7Q4M2X" autocapitalize="none" autocorrect="off" />
			{#if found}
				<div class="who">{found.fullName} · @{found.username} · {outletName(found.outletCode)}</div>
			{:else if checked}
				<div class="who bad">No member found.</div>
			{/if}
			<Field
				label="Amount (Rp)"
				bind:value={amount}
				inputmode="numeric"
				placeholder="25000"
				hint={amountNum > 0 ? rp(amountNum) : ''}
			/>
			<label class="select">
				<span class="lab">Outlet of this transaction</span>
				<select bind:value={outlet} aria-label="Outlet">
					{#each OUTLETS as o (o.code)}
						<option value={o.code}>{o.name}</option>
					{/each}
				</select>
				<span class="caret" aria-hidden="true">▾</span>
			</label>
			{#if menu.length}
				<div class="items">
					<span class="lab">What did they have? · optional</span>
					<div class="chips">
						{#each menu as m (m.id)}
							<span class="chip" class:on={(picked[m.id] ?? 0) > 0}>
								<button type="button" class="nm" onclick={() => bump(m.id, 1)}>{m.name}{#if picked[m.id]}<em>× {picked[m.id]}</em>{/if}</button>
								{#if picked[m.id]}<button type="button" class="mn" aria-label="Remove one {m.name}" onclick={() => bump(m.id, -1)}>−</button>{/if}
							</span>
						{/each}
					</div>
				</div>
			{/if}
			{#if error}<div class="msg bad" role="alert">{error}</div>{/if}
			{#if done}<div class="msg ok" role="status">{done}</div>{/if}
			<div class="gap"></div>
			<Button type="submit" loading={busy} disabled={!found || amountNum <= 0}>Record transaction</Button>
		</form>
		<a class="tool" href="/admin/reward">Validate a reward code ›</a>
		<a class="tool" href="/admin/crm">Open the CRM dashboard ›</a>
		<a class="tool" href="/admin/menu">Manage the menu ›</a>

		<section class="recent">
			<h2>Latest transactions</h2>
			{#if recent.length === 0}
				<p class="empty">Nothing recorded yet.</p>
			{:else}
				{#each recent as t (t.id)}
					<div class="row">
						<div>
							<b>@{t.username}</b>
							<span>{outletName(t.outletCode)} · {when(t.createdAt)}</span>
						</div>
						<strong>{rp(t.amountRp)}</strong>
					</div>
				{/each}
			{/if}
		</section>
	</Screen>
{/if}

<style>
	.items {
		margin-top: 4px;
		padding: 10px 12px 12px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.05);
		overflow: hidden;
	}
	.chip.on {
		border-color: var(--copper);
		background: rgba(189, 120, 78, 0.22);
	}
	.chip button {
		background: none;
		border: 0;
		color: #fff;
		font-size: 12px;
		font-weight: 600;
		padding: 7px 11px;
		cursor: pointer;
	}
	.chip em {
		margin-left: 5px;
		font-style: normal;
		color: var(--copper-soft);
	}
	.chip .mn {
		padding: 7px 10px 7px 4px;
		color: var(--copper-soft);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.form :global(.title) {
		margin-bottom: 8px;
	}
	.who {
		margin: -2px 4px 2px;
		font-size: 12px;
		font-weight: 600;
		color: var(--success);
	}
	.bad {
		color: var(--error);
	}
	.msg {
		margin: 2px 4px;
		font-size: 12px;
		line-height: 18px;
		font-weight: 600;
	}
	.msg.ok {
		color: var(--success);
	}
	.gap {
		height: 8px;
	}
	.select {
		position: relative;
		display: block;
		height: 54px;
		padding: 8px 16px 0;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
	}
	.lab {
		display: block;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
		text-transform: uppercase;
	}
	select {
		width: 100%;
		height: 26px;
		margin-top: 1px;
		padding: 0;
		appearance: none;
		-webkit-appearance: none;
		border: 0;
		outline: none;
		background: transparent;
		color: #fff;
		font-size: 15px;
		font-weight: 600;
	}
	select option {
		color: #111;
	}
	.caret {
		position: absolute;
		right: 16px;
		top: 19px;
		font-size: 13px;
		color: var(--copper-soft);
		pointer-events: none;
	}
	.tool {
		display: block;
		margin-top: 18px;
		text-align: center;
		font-size: 12px;
		font-weight: 700;
		color: var(--copper-light);
		text-decoration: none;
	}
	.recent {
		margin-top: 28px;
		padding-bottom: calc(36px + env(safe-area-inset-bottom));
	}
	h2 {
		margin: 0 0 8px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--copper-soft);
	}
	.empty {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.55);
	}
	.row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid var(--line);
		font-size: 13px;
	}
	.row span {
		display: block;
		margin-top: 2px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.55);
	}
</style>

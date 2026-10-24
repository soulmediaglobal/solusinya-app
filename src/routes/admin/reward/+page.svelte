<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import Screen from '#lib/components/Screen.svelte';
	import Field from '#lib/components/Field.svelte';
	import Button from '#lib/components/Button.svelte';
	import { OUTLETS, type OutletCode } from '#lib/config';
	import { loyalty } from '#lib/services';
	import type { VoucherPeek } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	let code = $state('');
	let outlet = $state<OutletCode>(untrack(() => (session.user?.outletCode ?? 'DRA') as OutletCode));
	let peek = $state<VoucherPeek | null>(null);
	let error = $state('');
	let done = $state('');
	let busy = $state(false);

	// Look the code up as it is typed, so the cashier sees what they are about to use.
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const c = code.trim();
		clearTimeout(timer);
		peek = null;
		error = '';
		done = '';
		if (c.length < 9) return;
		timer = setTimeout(async () => {
			try {
				const r = await loyalty.peekVoucher(c);
				if (c === code.trim()) peek = r;
			} catch {
				if (c === code.trim()) error = 'Code not found.';
			}
		}, 300);
		return () => clearTimeout(timer);
	});

	async function use() {
		if (!peek) return;
		busy = true;
		error = '';
		try {
			const r = await loyalty.useVoucher(code, outlet);
			done = `${r.reward} used by @${r.username}. Give it to the customer.`;
			code = '';
		} catch (e) {
			const m = e instanceof Error ? e.message : '';
			error = /used/.test(m) ? 'This code was already used.' : /expired/.test(m) ? 'This code has expired.' : 'Something went wrong.';
		} finally {
			busy = false;
		}
	}
	const label = (s: VoucherPeek['state']) => (s === 'valid' ? 'Valid' : s === 'used' ? 'Already used' : 'Expired');
</script>

{#if session.user?.isAdmin}
	<Screen back="/admin" heroHeight={210} top={92}>
		<div class="form">
			<h1 class="title">Validate reward</h1>
			<Field label="Reward code" bind:value={code} placeholder="SOLU-48K2" autocapitalize="characters" autocorrect="off" />
			{#if peek}
				<div class="peek" class:ok={peek.state === 'valid'}>
					<b>{peek.reward}</b>
					<span>{peek.fullName} · @{peek.username}</span>
					<em>{label(peek.state)}</em>
				</div>
			{/if}
			<label class="select">
				<span class="lab">Outlet</span>
				<select bind:value={outlet} aria-label="Outlet">
					{#each OUTLETS as o (o.code)}<option value={o.code}>{o.name}</option>{/each}
				</select>
				<span class="caret" aria-hidden="true">▾</span>
			</label>
			{#if error}<div class="msg bad" role="alert">{error}</div>{/if}
			{#if done}<div class="msg ok" role="status">{done}</div>{/if}
			<div class="gap"></div>
			<Button onclick={use} loading={busy} disabled={!peek || peek.state !== 'valid'}>Mark as used</Button>
		</div>
	</Screen>
{/if}

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-bottom: calc(36px + env(safe-area-inset-bottom));
	}
	.form :global(.title) {
		margin-bottom: 8px;
	}
	.peek {
		padding: 12px 14px;
		border-radius: 14px;
		border: 1px solid rgba(224, 138, 120, 0.6);
		background: rgba(224, 138, 120, 0.08);
		display: grid;
		gap: 3px;
		font-size: 12px;
	}
	.peek.ok {
		border-color: rgba(127, 185, 138, 0.6);
		background: rgba(127, 185, 138, 0.08);
	}
	.peek b {
		font-size: 15px;
	}
	.peek span {
		color: var(--text-2);
	}
	.peek em {
		font-style: normal;
		font-weight: 700;
		color: var(--error);
	}
	.peek.ok em {
		color: var(--success);
	}
	.msg {
		margin: 2px 4px;
		font-size: 12px;
		line-height: 18px;
		font-weight: 600;
	}
	.msg.bad {
		color: var(--error);
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
</style>

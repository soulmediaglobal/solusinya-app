<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Button from '#lib/components/Button.svelte';
	import Qr from '#lib/components/Qr.svelte';
	import { loyalty } from '#lib/services';
	import type { Voucher } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';
	import { voucherState } from '#lib/vouchers';

	const id = page.url.searchParams.get('id') ?? '';
	let v = $state<Voucher | null>(null);
	let now = $state(Date.now());
	let busy = $state(false);
	let timers: ReturnType<typeof setInterval>[] = [];

	async function refresh() {
		const x = await loyalty.voucher(id);
		if (!x) return void goto('/rewards', { replaceState: true });
		v = x;
		// The cashier scanned it: move on to the confirmation.
		if (x.status === 'used') await goto(`/rewards/done?id=${id}`, { replaceState: true });
	}
	onMount(() => {
		if (!session.user) return void goto('/', { replaceState: true });
		refresh();
		timers = [setInterval(() => (now = Date.now()), 1000), setInterval(refresh, 3000)];
	});
	onDestroy(() => timers.forEach(clearInterval));

	const live = $derived(v ? voucherState(v, now) === 'active' : false);
	const left = $derived(v?.codeExpiresAt ? Math.max(0, Math.floor((new Date(v.codeExpiresAt).getTime() - now) / 1000)) : 0);
	const clock = $derived(`${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`);

	async function renew() {
		busy = true;
		try {
			await loyalty.activate(id);
			await refresh();
		} finally {
			busy = false;
		}
	}
</script>

{#if v}
	<AppScreen nav={false}>
		<div class="page">
			<BackHeader title={v.rewardName} back="/rewards" sub="Show this to the cashier" />

			<div class="ticket" class:dead={!live}>
				{#if live && v.code}
					<div class="qr"><Qr value={v.code} size={190} label="Reward code" /></div>
					<div class="lab">REWARD CODE</div>
				{:else}
					<div class="gone">Code expired</div>
				{/if}
				<div class="tear"><i></i><span></span><i></i></div>
				{#if live && v.code}
					<div class="code">{v.code}</div>
					<div class="valid">Valid for <b>{clock}</b> · one use only</div>
				{:else}
					<p class="valid">Get a new code when you are at the counter.</p>
				{/if}
			</div>

			{#if live}
				<p class="keep">Keep this screen open until the cashier has scanned it.</p>
			{:else}
				<div class="renew"><Button onclick={renew} loading={busy}>Get a new code</Button></div>
			{/if}
			<div class="grow"></div>
			<a class="close" href="/rewards">Close</a>
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		padding: 24px 24px calc(28px + env(safe-area-inset-bottom));
	}
	@media (min-width: 480px) {
		.page {
			min-height: 844px;
		}
	}
	.ticket {
		position: relative;
		margin-top: 28px;
		padding: 26px 20px 24px;
		border-radius: 20px;
		background: var(--cream);
		color: #2a1a10;
		text-align: center;
	}
	.ticket.dead {
		background: #2a211b;
		color: #fff;
	}
	.qr {
		display: inline-flex;
	}
	.lab {
		margin-top: 12px;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.28em;
		color: #83472c;
	}
	.gone {
		padding: 56px 0 40px;
		font-size: 18px;
		font-weight: 800;
	}
	.tear {
		position: relative;
		display: flex;
		align-items: center;
		margin: 16px -20px;
	}
	.tear span {
		flex: 1;
		border-top: 1.5px dashed rgba(131, 71, 44, 0.45);
	}
	.tear i {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--bg);
	}
	.tear i:first-child {
		margin-left: -10px;
	}
	.tear i:last-child {
		margin-right: -10px;
	}
	.code {
		font-size: 34px;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: #3a1f12;
	}
	.valid {
		margin: 8px 0 0;
		font-size: 11px;
		color: #6b5646;
	}
	.dead .valid {
		color: var(--text-2);
	}
	.valid b {
		color: #83472c;
	}
	.keep {
		margin: 28px 12px 0;
		text-align: center;
		font-size: 12px;
		line-height: 18px;
		color: var(--text-2);
	}
	.renew {
		margin-top: 28px;
	}
	.grow {
		flex: 1;
		min-height: 24px;
	}
	.close {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 52px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}
</style>

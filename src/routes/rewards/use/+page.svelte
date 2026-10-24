<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Button from '#lib/components/Button.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { loyalty } from '#lib/services';
	import type { Voucher } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';
	import { expiryLabel, isUsable, sourceNote } from '#lib/vouchers';

	const id = page.url.searchParams.get('id') ?? '';
	let v = $state<Voucher | null>(null);
	let busy = $state(false);
	let error = $state('');

	$effect(() => {
		if (!session.user) return void goto('/', { replaceState: true });
		loyalty.voucher(id).then((x) => {
			if (!x || !isUsable(x)) goto('/rewards', { replaceState: true });
			else v = x;
		});
	});

	async function use() {
		busy = true;
		error = '';
		try {
			await loyalty.activate(id);
			await goto(`/rewards/code?id=${id}`, { replaceState: true });
		} catch {
			error = 'Could not start this reward. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

{#if v}
	<AppScreen nav={false}>
		<div class="page">
			<BackHeader title="Use this reward?" back="/rewards" />
			<div class="card">
				<span class="gi"><Icon name="gift" size={24} /></span>
				<h2>{v.rewardName}</h2>
				<p>{sourceNote(v)} · {expiryLabel(v.expiresAt)}</p>
			</div>
			<ul>
				<li><Icon name="check" size={16} /><span>Your code is valid for <b>10 minutes</b> after you tap Use now.</span></li>
				<li><Icon name="qr" size={16} /><span>Show it to the cashier, who will scan it with your order.</span></li>
				<li><Icon name="plus" size={16} /><span>A reward can only be used <b>once</b>. Please open it at the counter.</span></li>
			</ul>
			<div class="grow"></div>
			{#if error}<div class="err" role="alert">{error}</div>{/if}
			<Button onclick={use} loading={busy}>Use now</Button>
			<a class="cancel" href="/rewards">Cancel</a>
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
	.card {
		margin-top: 48px;
		padding: 30px 20px;
		text-align: center;
		border-radius: 16px;
		border: 1px solid rgba(189, 120, 78, 0.6);
		background: rgba(189, 120, 78, 0.06);
	}
	.gi {
		display: inline-flex;
		width: 48px;
		height: 48px;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(189, 120, 78, 0.28);
		color: var(--copper-light);
	}
	h2 {
		margin: 14px 0 0;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.04em;
	}
	.card p {
		margin: 8px 0 0;
		font-size: 11px;
		color: var(--text-2);
	}
	ul {
		list-style: none;
		margin: 40px 6px 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	li {
		display: flex;
		gap: 12px;
		font-size: 12px;
		line-height: 19px;
		color: var(--text-2);
	}
	li :global(svg) {
		flex: none;
		margin-top: 1px;
		color: var(--copper-light);
	}
	li b {
		color: #fff;
	}
	.grow {
		flex: 1;
		min-height: 24px;
	}
	.err {
		margin-bottom: 10px;
		font-size: 12px;
		font-weight: 600;
		color: var(--error);
		text-align: center;
	}
	.cancel {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 52px;
		margin-top: 12px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}
</style>

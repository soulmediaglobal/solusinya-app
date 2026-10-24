<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	let tab = $state<'terms' | 'privacy'>('terms');
	const terms = [
		['1. About Solu Club', 'Solu Club is the membership program of Solusi Kopi. By creating an account you agree to these terms.'],
		['2. Stamps and beans', 'You earn one stamp per qualifying purchase and beans based on the amount you spend. Stamps and beans have no cash value and cannot be transferred.'],
		['3. Rewards', 'Rewards are issued as vouchers with an expiry date. A voucher can be used once and only at participating Solusi Kopi outlets.'],
		['4. Your account', 'Keep your password safe. You are responsible for activity on your account. We may suspend accounts used to collect stamps unfairly.'],
		['5. Changes', 'We may update these terms and will tell you in the app when we do.']
	];
	const privacy = [
		['1. What we collect', 'Your name, username, email, WhatsApp number, birthday, registered outlet, and your purchases made with your member QR. Social accounts and a profile photo are optional.'],
		['2. How we use it', 'To run your membership: stamps, beans, rewards and your birthday reward. We may contact you on WhatsApp or email about your account and rewards.'],
		['3. Who can see it', 'Only the Solusi Kopi team. We do not sell your data.'],
		['4. Your choices', 'You can edit your details in the app, and delete your account at any time. Deleting removes your stamps, beans, rewards and history.']
	];
	const items = $derived(tab === 'terms' ? terms : privacy);
</script>

{#if session.user}
	<AppScreen nav={false}>
		<div class="page">
			<BackHeader title="Terms & privacy" back="/profile" />
			<div class="tabs" role="tablist">
				<button role="tab" aria-selected={tab === 'terms'} class:on={tab === 'terms'} onclick={() => (tab = 'terms')}>Terms</button>
				<button role="tab" aria-selected={tab === 'privacy'} class:on={tab === 'privacy'} onclick={() => (tab = 'privacy')}>Privacy</button>
			</div>
			<small>LAST UPDATED 1 OCTOBER 2026</small>
			{#each items as [h, body] (h)}
				<h2>{h}</h2>
				<p>{body}</p>
			{/each}
			<p class="sample">Sample text. Final wording to be provided.</p>
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 28px 36px;
	}
	.tabs {
		display: flex;
		margin-top: 24px;
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
		background: var(--grad-primary);
		color: #fff;
	}
	small {
		display: block;
		margin-top: 20px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
	}
	h2 {
		margin: 22px 0 0;
		font-size: 14px;
		font-weight: 800;
	}
	p {
		margin: 8px 0 0;
		font-size: 13px;
		line-height: 20px;
		color: var(--text-2);
	}
	.sample {
		margin-top: 28px;
		font-size: 11px;
		color: var(--text-3);
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	// Set in .env: digits only with country code (e.g. 62812...) and a support email address.
	const wa = ((import.meta.env.VITE_HELP_WHATSAPP as string | undefined) ?? '').replace(/\D/g, '');
	const mail = (import.meta.env.VITE_HELP_EMAIL as string | undefined) ?? '';
	const subject = $derived(encodeURIComponent(`Solu Club help · ${session.user?.memberId ?? ''}`));

	const faq = [
		['How do I earn stamps?', 'Show your member QR to the cashier before you pay. Each qualifying purchase adds one stamp.'],
		['How do beans work?', 'You earn beans from the amount you spend. Spend them on rewards under Rewards, then Get rewards.'],
		['My stamp is missing', 'Contact us with your receipt and your member ID, and we will check it for you.'],
		['My reward expired', 'Rewards expire a set time after you get them, and an expired reward cannot be used. If you think it expired by mistake, contact us.'],
		['How do I change my outlet?', 'Only our team can change your registered outlet. Contact us and we will update it.']
	];
	let open = $state(0);
</script>

{#if session.user}
	<AppScreen nav={false}>
		<div class="page">
			<BackHeader title="Help" back="/profile" />
			<div class="faq">
				{#each faq as [q, a], i (q)}
					<div class="q" class:open={open === i}>
						<button aria-expanded={open === i} onclick={() => (open = open === i ? -1 : i)}>
							<span>{q}</span><b aria-hidden="true">{open === i ? '−' : '+'}</b>
						</button>
						{#if open === i}<p>{a}</p>{/if}
					</div>
				{/each}
			</div>

			<h3>STILL NEED HELP?</h3>
			{#if wa}
				<a class="contact" href="https://wa.me/{wa}?text={subject}" target="_blank" rel="noopener"><span>Chat on WhatsApp</span><i>›</i></a>
			{:else}
				<div class="contact off"><span>Chat on WhatsApp</span><small>Coming soon</small></div>
			{/if}
			{#if mail}
				<a class="contact" href="mailto:{mail}?subject={subject}"><span>Email us</span><i>›</i></a>
			{:else}
				<div class="contact off"><span>Email us</span><small>Coming soon</small></div>
			{/if}
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 28px 36px;
	}
	.faq {
		margin-top: 24px;
	}
	.q {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.q button {
		width: 100%;
		min-height: 56px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border: 0;
		background: transparent;
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		text-align: left;
		cursor: pointer;
	}
	.q b {
		color: var(--copper-light);
		font-size: 18px;
	}
	.q p {
		margin: 0 0 16px;
		font-size: 13px;
		line-height: 20px;
		color: var(--text-2);
	}
	h3 {
		margin: 32px 0 6px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
	}
	.contact {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 52px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}
	.contact i {
		font-style: normal;
		color: var(--copper-light);
		font-size: 16px;
	}
	.contact.off {
		color: var(--text-3);
	}
	.contact small {
		font-size: 11px;
		font-weight: 600;
	}
</style>

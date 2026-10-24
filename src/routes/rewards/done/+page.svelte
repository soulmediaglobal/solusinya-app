<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import Button from '#lib/components/Button.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { outletName, whenLabel } from '#lib/format';
	import { loyalty } from '#lib/services';
	import type { Voucher } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	const id = page.url.searchParams.get('id') ?? '';
	let v = $state<Voucher | null>(null);
	$effect(() => {
		if (!session.user) return void goto('/', { replaceState: true });
		loyalty.voucher(id).then((x) => {
			if (!x || x.status !== 'used') goto('/rewards', { replaceState: true });
			else v = x;
		});
	});
</script>

{#if v}
	<AppScreen nav={false}>
		<div class="page">
			<img class="mascot" src="/img/solu-cheer.png" alt="" />
			<div class="grow"></div>
			<span class="ok"><Icon name="check" size={22} /></span>
			<h1>Reward applied</h1>
			<p class="enjoy">Enjoy your {v.rewardName.toLowerCase()}!</p>
			<dl>
				<div><dt>Reward</dt><dd>{v.rewardName}</dd></div>
				<div><dt>Outlet</dt><dd>{outletName(v.usedOutlet)}</dd></div>
				<div><dt>Used at</dt><dd>{v.usedAt ? whenLabel(v.usedAt) : ''}</dd></div>
			</dl>
			<Button href="/home">Back to home</Button>
			<a class="link" href="/rewards">View my rewards</a>
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100dvh;
		padding: 40px 24px calc(28px + env(safe-area-inset-bottom));
		text-align: center;
	}
	@media (min-width: 480px) {
		.page {
			min-height: 844px;
		}
	}
	.page > :global(a.btn),
	.page > :global(a:not(.link)) {
		align-self: stretch;
	}
	.mascot {
		width: 210px;
		height: 250px;
		object-fit: contain;
		filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.5));
	}
	.grow {
		flex: 1;
		min-height: 16px;
	}
	.ok {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #e0a073, #bd784e 58%, #83472c);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 24px rgba(189, 120, 78, 0.5);
	}
	h1 {
		margin: 16px 0 0;
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.045em;
	}
	.enjoy {
		margin: 8px 0 26px;
		font-size: 13px;
		color: var(--text-2);
	}
	dl {
		align-self: stretch;
		margin: 0 0 28px;
		padding: 14px 18px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
	}
	dl div {
		display: flex;
		justify-content: space-between;
		padding: 7px 0;
		font-size: 12px;
	}
	dt {
		color: var(--text-3);
	}
	dd {
		margin: 0;
		font-weight: 700;
	}
	.link {
		margin-top: 18px;
		font-size: 13px;
		font-weight: 700;
		color: var(--copper-light);
		text-decoration: none;
	}
</style>

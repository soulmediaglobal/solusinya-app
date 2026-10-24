<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { loyalty } from '#lib/services';
	import type { Sticker } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	let sticker = $state<Sticker | null>(null);
	let loaded = $state(false);
	$effect(() => {
		if (!session.user) return;
		const id = page.url.searchParams.get('id');
		loyalty.stickers().then((all) => {
			sticker = all.find((s) => s.id === id) ?? null;
			loaded = true;
		});
	});
</script>

{#if session.user}
	<AppScreen>
		<div class="page">
			<BackHeader title={sticker?.name ?? 'Sticker'} back="/community/stickers" />
			{#if sticker}
				<div class="stage"><img src={sticker.image} alt={sticker.name} /></div>
				<a class="btn" href={sticker.image} download="{sticker.name}.png">Download image</a>
				<span class="btn off">Add to Telegram · soon</span>
				<span class="btn off">Send to my WhatsApp · soon</span>
			{:else if loaded}
				<p class="empty">Sticker not found.</p>
			{/if}
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 24px 32px;
		display: grid;
		gap: 12px;
	}
	.stage {
		margin: 18px 0 6px;
		padding: 24px;
		border-radius: 20px;
		border: 1px solid rgba(189, 120, 78, 0.5);
		background: rgba(189, 120, 78, 0.07);
	}
	.stage img {
		display: block;
		width: 100%;
		max-height: 260px;
		object-fit: contain;
	}
	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 46px;
		border-radius: 30px;
		background: linear-gradient(90deg, #83472c, #a05a37);
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	.btn.off {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-2);
	}
	.empty {
		text-align: center;
		color: var(--text-2);
		font-size: 13px;
	}
</style>

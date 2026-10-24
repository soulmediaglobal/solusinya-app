<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { levelFor } from '#lib/levels';
	import { loyalty } from '#lib/services';
	import type { Sticker } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	let lvl = $state(1);
	let stickers = $state<Sticker[]>([]);
	$effect(() => {
		if (!session.user) return;
		Promise.all([loyalty.xp(), loyalty.levels(), loyalty.stickers()]).then(([x, l, s]) => {
			lvl = levelFor(x, l)?.current.level ?? 1;
			stickers = s;
		});
	});
	const unlocked = (s: Sticker) => s.unlockLevel !== null && s.unlockLevel <= lvl;
	const count = $derived(stickers.filter(unlocked).length);
	const total = $derived(stickers.filter((s) => s.unlockLevel !== null).length);
</script>

{#if session.user}
	<AppScreen>
		<div class="page">
			<BackHeader title="Stickers" back="/community" sub="{count} of {total} unlocked" />
			<div class="grid">
				{#each stickers as s (s.id)}
					{#if unlocked(s)}
						<a class="tile" href="/community/stickers/view?id={s.id}">
							<img src={s.image} alt={s.name} />
							<span>{s.name}</span>
						</a>
					{:else}
						<div class="tile locked" aria-label="{s.name}, locked">
							<img src={s.image} alt="" />
							<span>{s.unlockLevel ? `Unlocks at Level ${s.unlockLevel}` : (s.season ?? 'Coming soon')}</span>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 24px 32px;
	}
	.grid {
		margin-top: 22px;
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 10px;
	}
	.tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 6px;
		border-radius: 14px;
		border: 1px solid rgba(189, 120, 78, 0.5);
		background: rgba(189, 120, 78, 0.07);
		color: inherit;
		text-decoration: none;
		text-align: center;
	}
	.tile img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: contain;
	}
	.tile span {
		font-size: 10px;
		line-height: 1.3;
		color: var(--text-2);
	}
	.locked {
		border-color: rgba(255, 255, 255, 0.14);
		background: transparent;
	}
	.locked img {
		filter: grayscale(1) brightness(0.4);
		opacity: 0.6;
	}
</style>

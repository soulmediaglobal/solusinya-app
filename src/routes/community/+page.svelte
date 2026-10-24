<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import { levelFor, type LevelState } from '#lib/levels';
	import { loyalty } from '#lib/services';
	import type { Sticker } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	const discord = (import.meta.env.VITE_DISCORD_INVITE as string | undefined) || '';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});

	let xp = $state(0);
	let lv = $state<LevelState | null>(null);
	let stickers = $state<Sticker[]>([]);
	$effect(() => {
		if (!session.user) return;
		Promise.all([loyalty.xp(), loyalty.levels(), loyalty.stickers()]).then(([x, l, s]) => {
			xp = x;
			lv = levelFor(x, l);
			stickers = s;
		});
	});
	const open = $derived(stickers.filter((s) => s.unlockLevel !== null && lv && s.unlockLevel <= lv.current.level));
	const regular = $derived(stickers.filter((s) => s.unlockLevel !== null));
</script>

{#if session.user}
	<AppScreen>
		<div class="page">
			<h1>Community</h1>

			{#if lv}
				<a class="card level" href="/community/levels">
					<small>YOUR LEVEL</small>
					<div class="row"><b>{lv.current.name}</b><span>Level {lv.current.level}</span></div>
					<div class="bar"><i style="width:{lv.pct}%"></i></div>
					<p>
						{#if lv.next}{xp} / {lv.next.minXp} XP · {lv.toNext} XP to {lv.next.name}{:else}{xp} XP · top level reached{/if}
					</p>
				</a>
			{/if}

			<section class="card">
				<b>Join our Discord</b>
				<p>Meet other Solu Club members, hear about new menus and events first.</p>
				{#if discord}
					<a class="btn" href={discord} target="_blank" rel="noopener">Join Discord</a>
				{:else}
					<span class="btn off">Invite link coming soon</span>
				{/if}
			</section>

			<a class="card row2" href="/community/stickers">
				<div><b>Stickers</b><p>{open.length} / {regular.length} unlocked</p></div>
				<span class="go">→</span>
			</a>

			<section class="card dashed">
				<b>Seasons</b>
				<p>Seasonal stickers and challenges are coming. Stay tuned.</p>
			</section>
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 32px 24px 32px;
		display: grid;
		gap: 12px;
	}
	h1 {
		margin: 0 0 8px;
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.04em;
	}
	.card {
		display: block;
		padding: 16px;
		border-radius: 16px;
		border: 1px solid rgba(189, 120, 78, 0.5);
		background: rgba(189, 120, 78, 0.07);
		color: inherit;
		text-decoration: none;
	}
	.card.dashed {
		border-style: dashed;
		background: transparent;
		border-color: rgba(255, 255, 255, 0.2);
	}
	small {
		display: block;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
	}
	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-top: 8px;
	}
	.row b {
		font-size: 24px;
		letter-spacing: -0.03em;
	}
	.row span {
		font-size: 12px;
		color: var(--copper-soft);
		font-weight: 700;
	}
	.bar {
		margin-top: 12px;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.14);
		overflow: hidden;
	}
	.bar i {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, #83472c, #e0a073);
	}
	p {
		margin: 6px 0 0;
		font-size: 12px;
		color: var(--text-2);
		line-height: 1.45;
	}
	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		margin-top: 14px;
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
	.row2 {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.go {
		font-size: 20px;
		color: var(--copper-soft);
	}
</style>

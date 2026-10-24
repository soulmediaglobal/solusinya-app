<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { levelFor, type LevelState } from '#lib/levels';
	import { loyalty } from '#lib/services';
	import type { Level } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	let xp = $state(0);
	let levels = $state<Level[]>([]);
	let lv = $state<LevelState | null>(null);
	$effect(() => {
		if (!session.user) return;
		Promise.all([loyalty.xp(), loyalty.levels()]).then(([x, l]) => {
			xp = x;
			levels = l;
			lv = levelFor(x, l);
		});
	});
	const earn = [
		['Every bean earned', '+1 XP'],
		['Every visit', '+10 XP'],
		['Completing a stamp card', '+100 XP'],
		['Complete your profile', '+50 XP · soon'],
		['Link your Discord', '+30 XP · soon'],
		['Add a social account', '+10 XP each · soon']
	];
</script>

{#if session.user}
	<AppScreen>
		<div class="page">
			<BackHeader title="Levels" back="/community" />
			<p class="lead">You have <b>{xp} XP</b>. Your level never goes down.</p>

			<ul class="levels">
				{#each levels as l (l.level)}
					{@const done = lv && l.level < lv.current.level}
					{@const now = lv?.current.level === l.level}
					<li class:now class:done>
						<span class="dot">{done ? '✓' : l.level}</span>
						<div class="txt"><b>{l.name}</b><small>{l.minXp.toLocaleString('id-ID')} XP{l.perks ? ` · ${l.perks}` : ''}</small></div>
						{#if now}<em>You are here</em>{/if}
					</li>
				{/each}
			</ul>

			<h2>How to earn XP</h2>
			<ul class="earn">
				{#each earn as [what, pts] (what)}
					<li><span>{what}</span><b class:soon={pts.includes('soon')}>{pts}</b></li>
				{/each}
			</ul>
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 24px 32px;
	}
	.lead {
		margin: 18px 0 0;
		text-align: center;
		font-size: 13px;
		color: var(--text-2);
	}
	.lead b {
		color: var(--text-1, #fff);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.levels {
		margin-top: 22px;
		display: grid;
		gap: 10px;
	}
	.levels li {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 14px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.14);
	}
	.levels li.now {
		border-color: rgba(189, 120, 78, 0.8);
		background: rgba(189, 120, 78, 0.1);
	}
	.dot {
		flex: none;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 800;
		background: rgba(255, 255, 255, 0.08);
	}
	.now .dot,
	.done .dot {
		background: rgba(189, 120, 78, 0.3);
		color: var(--copper-light);
	}
	.txt {
		flex: 1;
		min-width: 0;
	}
	.txt b {
		display: block;
		font-size: 14px;
	}
	small {
		display: block;
		margin-top: 2px;
		font-size: 11px;
		color: var(--text-2);
	}
	em {
		font-style: normal;
		font-size: 10px;
		font-weight: 700;
		color: var(--copper-light);
	}
	h2 {
		margin: 28px 0 6px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
		text-transform: uppercase;
	}
	.earn li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 0;
		font-size: 13px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.earn b {
		color: var(--copper-light);
		font-size: 12px;
		white-space: nowrap;
	}
	.earn b.soon {
		color: var(--text-2);
	}
</style>

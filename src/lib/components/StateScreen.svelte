<script lang="ts">
	import type { Snippet } from 'svelte';
	import PhotoHeader from './PhotoHeader.svelte';

	let {
		icon,
		title,
		note,
		actions
	}: { icon: 'offline' | 'warning' | 'lock'; title: string; note: string; actions: Snippet } = $props();
</script>

<main class="state">
	<PhotoHeader height={300} logo={true} back={null} />
	<div class="ic-wrap">
		<div class="icon">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				{#if icon === 'offline'}
					<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
				{:else if icon === 'warning'}
					<path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" />
				{:else}
					<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
				{/if}
			</svg>
		</div>
	</div>
	<div class="txt">
		<h1>{title}</h1>
		<p>{note}</p>
	</div>
	<div class="grow"></div>
	<div class="actions">{@render actions()}</div>
</main>

<style>
	.state {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}
	@media (min-width: 480px) {
		.state {
			min-height: 844px;
		}
	}
	.ic-wrap {
		position: relative;
		z-index: 1;
		margin-top: 150px;
		display: flex;
		justify-content: center;
	}
	.icon {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		border: 1px solid rgba(189, 120, 78, 0.7);
		background: rgba(189, 120, 78, 0.18);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.txt {
		position: relative;
		z-index: 1;
		padding: 0 28px;
		margin-top: 28px;
		text-align: center;
	}
	h1 {
		margin: 0;
		font-size: 25px;
		font-weight: 800;
		letter-spacing: -0.045em;
		line-height: 1.1;
	}
	p {
		margin: 14px 0 0;
		font-size: 13px;
		line-height: 21px;
		color: var(--text-2);
	}
	.grow {
		flex: 1;
	}
	.actions {
		position: relative;
		z-index: 1;
		padding: 20px 28px calc(40px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>

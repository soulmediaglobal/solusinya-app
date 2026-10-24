<script lang="ts">
	import type { Snippet } from 'svelte';
	import PhotoHeader from './PhotoHeader.svelte';

	let {
		children,
		footer,
		back = null,
		heroHeight = 300,
		logo = true,
		top = 150
	}: {
		children: Snippet;
		footer?: Snippet;
		back?: string | null;
		heroHeight?: number;
		logo?: boolean;
		/** distance from the top of the screen to where the content begins */
		top?: number;
	} = $props();
</script>

<main class="screen">
	<PhotoHeader height={heroHeight} {back} {logo} />
	<div class="body" style:padding-top="{top}px">
		{@render children()}
	</div>
	{#if footer}
		<div class="footer">{@render footer()}</div>
	{/if}
</main>

<style>
	.screen {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: inherit;
		min-height: 100dvh;
	}
	@media (min-width: 480px) {
		.screen {
			min-height: min(860px, calc(100dvh - 48px));
		}
	}
	.body {
		position: relative;
		z-index: 1;
		flex: 1;
		padding-left: 28px;
		padding-right: 28px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.footer {
		position: relative;
		z-index: 1;
		padding: 20px 28px calc(36px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	:global(.title) {
		margin: 0;
		text-align: center;
		font-size: 25px;
		font-weight: 800;
		letter-spacing: -0.045em;
		line-height: 1.1;
		white-space: nowrap;
	}
	:global(.sub) {
		margin: 0 0 6px;
		text-align: center;
		font-size: 13px;
		line-height: 20px;
		color: var(--text-2);
	}
	:global(.foot-link) {
		text-align: center;
		font-size: 13px;
		color: var(--text-2);
	}
	:global(.foot-link a),
	:global(a.link) {
		color: var(--copper-light);
		font-weight: 700;
		text-decoration: none;
	}
</style>

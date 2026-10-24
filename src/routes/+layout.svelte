<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { session } from '#lib/stores/session.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	onMount(() => session.init());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Solu Club</title>
</svelte:head>

<div class="shell">
	{#if session.ready}
		{@render children()}
	{/if}
</div>

<style>
	.shell {
		position: relative;
		width: 100%;
		max-width: 430px;
		min-height: 100dvh;
		margin: 0 auto;
		background: var(--bg);
		overflow-x: hidden;
	}
	@media (min-width: 480px) {
		.shell {
			margin: 24px auto;
			min-height: min(860px, calc(100dvh - 48px));
			border-radius: 40px;
			border: 1px solid rgba(255, 255, 255, 0.28);
			box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
		}
	}
</style>

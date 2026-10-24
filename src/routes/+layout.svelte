<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { session } from '#lib/stores/session.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	// On desktop the app is shown as a 390x844 phone frame, scaled down to fit short windows.
	let zoom = $state(1);
	function fit() {
		zoom = innerWidth >= 480 ? Math.min(1, (innerHeight - 32) / 844) : 1;
	}
	onMount(() => {
		fit();
		addEventListener('resize', fit);
		session.init();
		return () => removeEventListener('resize', fit);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Solu Club</title>
</svelte:head>

<div class="shell" style="--zoom: {zoom}">
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
			zoom: var(--zoom, 1);
			width: 390px;
			height: 844px;
			min-height: 0;
			margin: 16px auto;
			overflow-y: auto;
			scrollbar-width: none;
			border-radius: 40px;
			border: 1px solid rgba(255, 255, 255, 0.28);
			box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
		}
	}
</style>

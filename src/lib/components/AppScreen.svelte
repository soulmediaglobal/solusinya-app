<script lang="ts">
	import type { Snippet } from 'svelte';
	import BottomNav from './BottomNav.svelte';

	let { children, nav = true }: { children: Snippet; nav?: boolean } = $props();
</script>

<main class="app">
	<div class="content">{@render children()}</div>
	{#if nav}<BottomNav />{/if}
</main>

<style>
	.app {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}
	@media (min-width: 480px) {
		.app {
			min-height: 844px;
		}
	}
	.content {
		position: relative;
		flex: 1;
	}
</style>

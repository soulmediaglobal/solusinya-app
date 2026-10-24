<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import AppScreen from './AppScreen.svelte';
	import { session } from '#lib/stores/session.svelte';

	let { title, note, children }: { title: string; note: string; children?: Snippet } = $props();
	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
</script>

{#if session.user}
	<AppScreen>
		<div class="page">
			<h1>{title}</h1>
			<p>{note}</p>
			{@render children?.()}
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 72px 28px 32px;
		text-align: center;
	}
	h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.045em;
	}
	p {
		margin: 12px 0 28px;
		font-size: 13px;
		line-height: 20px;
		color: var(--text-2);
	}
</style>

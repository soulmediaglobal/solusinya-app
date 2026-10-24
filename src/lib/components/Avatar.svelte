<script lang="ts">
	import { initials } from '#lib/profile';

	let { name, src = null, size = 92 }: { name: string; src?: string | null; size?: number } = $props();
</script>

<div class="av" style:width="{size}px" style:height="{size}px" style:font-size="{Math.round(size * 0.35)}px">
	{#if src}<img {src} alt="" />{:else}{initials(name)}{/if}
</div>

<style>
	.av {
		box-sizing: border-box;
		border-radius: 50%;
		border: 2px solid var(--copper);
		background: radial-gradient(circle at 35% 30%, #3a2415, #14100c);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--copper-light);
		box-shadow: 0 0 30px rgba(189, 120, 78, 0.3);
		overflow: hidden;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>

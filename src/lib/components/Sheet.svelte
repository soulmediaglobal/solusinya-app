<script lang="ts">
	import type { Snippet } from 'svelte';

	let { onclose, label, children }: { onclose: () => void; label: string; children: Snippet } = $props();
</script>

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="sheet" role="dialog" aria-label={label}>
	<div class="grab"></div>
	{@render children()}
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 20;
		background: rgba(0, 0, 0, 0.62);
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 21;
		padding: 12px 24px calc(28px + env(safe-area-inset-bottom));
		border-radius: 28px 28px 0 0;
		border-top: 1px solid rgba(189, 120, 78, 0.55);
		background: #14100c;
		box-shadow: 0 -16px 40px rgba(0, 0, 0, 0.6);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.grab {
		align-self: center;
		width: 40px;
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.25);
		margin-bottom: 8px;
	}
</style>

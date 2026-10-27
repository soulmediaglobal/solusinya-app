<script lang="ts">
	let { value, label, note = '', color = '#7fb98a' }: { value: number; label: string; note?: string; color?: string } = $props();
	const v = $derived(Math.max(0, Math.min(100, value)));
	const L = Math.PI * 40;
</script>

<div class="g">
	<svg viewBox="0 0 100 58" role="img" aria-label="{label}: {Math.round(v)}%">
		<path d="M10,50 A40,40 0 0 1 90,50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="9" stroke-linecap="round" />
		<path d="M10,50 A40,40 0 0 1 90,50" fill="none" stroke={color} stroke-width="9" stroke-linecap="round" stroke-dasharray="{(v / 100) * L} {L}" />
		<text x="50" y="46" text-anchor="middle" class="num">{Math.round(v)}%</text>
	</svg>
	<b>{label}</b>
	{#if note}<small>{note}</small>{/if}
</div>

<style>
	.g {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		text-align: center;
	}
	svg {
		width: 150px;
	}
	.num {
		font-size: 15px;
		font-weight: 800;
		fill: #fff;
	}
	b {
		font-size: 12px;
	}
	small {
		font-size: 10px;
		color: var(--text-3);
	}
</style>

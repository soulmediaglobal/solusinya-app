<script lang="ts">
	let {
		items,
		color = 'var(--copper)',
		height = 130,
		showValues = true,
		format = (n: number) => String(n)
	}: {
		items: { label: string; n: number; color?: string }[];
		color?: string;
		height?: number;
		showValues?: boolean;
		format?: (n: number) => string;
	} = $props();
	const max = $derived(Math.max(1, ...items.map((i) => i.n)));
</script>

<div class="cols" style:height="{height + 38}px" role="img" aria-label="Column chart">
	{#each items as it (it.label)}
		<div class="col" title="{it.label}: {format(it.n)}">
			{#if showValues}<span class="v">{format(it.n)}</span>{/if}
			<div class="bar" style:height="{Math.max(2, (it.n / max) * height)}px" style:background={it.color ?? color}></div>
			<span class="l">{it.label}</span>
		</div>
	{/each}
</div>

<style>
	.cols {
		display: flex;
		align-items: flex-end;
		gap: 5px;
	}
	.col {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
	}
	.bar {
		width: 100%;
		border-radius: 4px 4px 0 0;
	}
	.v {
		font-size: 10px;
		font-weight: 700;
		color: var(--text-2);
	}
	.l {
		font-size: 9px;
		color: var(--text-3);
		white-space: nowrap;
	}
</style>

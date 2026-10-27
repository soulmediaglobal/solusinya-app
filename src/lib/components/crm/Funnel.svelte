<script lang="ts">
	let { stages }: { stages: { label: string; n: number; note?: string }[] } = $props();
	const top = $derived(Math.max(1, stages[0]?.n ?? 1));
</script>

<div class="funnel" role="img" aria-label="Funnel">
	{#each stages as s, i (s.label)}
		<div class="stage">
			<div class="bar" style:width="{Math.max(8, (s.n / top) * 100)}%" style:opacity={1 - i * 0.14}>
				<b>{s.n.toLocaleString('id-ID')}</b>
			</div>
			<div class="meta">
				<span>{s.label}</span>
				<small>
					{Math.round((s.n / top) * 100)}% of sign-ups{#if i > 0 && stages[i - 1].n > 0} · {Math.round((s.n / stages[i - 1].n) * 100)}% of previous step{/if}
				</small>
			</div>
		</div>
	{/each}
</div>

<style>
	.funnel {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.stage {
		display: grid;
		grid-template-columns: 1fr;
		gap: 4px;
	}
	.bar {
		min-width: 46px;
		height: 30px;
		border-radius: 8px;
		background: var(--grad-primary);
		display: flex;
		align-items: center;
		padding: 0 12px;
		margin: 0 auto 0 0;
		transition: width 0.3s;
	}
	.bar b {
		font-size: 13px;
	}
	.meta {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font-size: 12px;
		font-weight: 600;
	}
	small {
		font-size: 10px;
		font-weight: 400;
		color: var(--text-3);
		text-align: right;
	}
</style>

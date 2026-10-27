<script lang="ts">
	import { OUTLETS } from '#lib/config';
	import { crmFilter } from '#lib/stores/crmFilter.svelte';

	let { range = true, onchange }: { range?: boolean; onchange?: () => void } = $props();
	const PRESETS = [7, 30, 90] as const;
	const active = $derived(crmFilter.to === new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) ? crmFilter.days : 0);
	const set = (n: number) => {
		crmFilter.preset(n);
		onchange?.();
	};
</script>

<div class="bar">
	{#if range}
		<div class="presets" role="group" aria-label="Period">
			{#each PRESETS as n (n)}
				<button type="button" class:on={active === n} onclick={() => set(n)}>{n} days</button>
			{/each}
		</div>
		<label class="dt"><span>From</span><input type="date" bind:value={crmFilter.from} max={crmFilter.to} onchange={() => onchange?.()} /></label>
		<label class="dt"><span>To</span><input type="date" bind:value={crmFilter.to} min={crmFilter.from} onchange={() => onchange?.()} /></label>
	{/if}
	<label class="dt">
		<span>Outlet</span>
		<select bind:value={crmFilter.outlet} onchange={() => onchange?.()}>
			<option value="">All outlets</option>
			{#each OUTLETS as o (o.code)}<option value={o.code}>{o.name}</option>{/each}
		</select>
	</label>
</div>

<style>
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 10px;
	}
	.presets {
		display: flex;
		gap: 6px;
	}
	.presets button {
		height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--text-2);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.presets button.on {
		background: var(--grad-primary);
		border-color: transparent;
		color: #fff;
	}
	.dt {
		display: grid;
		gap: 3px;
	}
	.dt span {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--copper-soft);
	}
	.dt input,
	.dt select {
		height: 36px;
		padding: 0 10px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
		font-size: 12px;
		font-weight: 600;
		color-scheme: dark;
	}
	.dt select option {
		color: #111;
	}
</style>

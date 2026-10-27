<script lang="ts">
	let {
		axes,
		series,
		size = 300,
		rings = 4
	}: {
		axes: string[];
		series: { name: string; color: string; values: number[]; dashed?: boolean }[];
		size?: number;
		rings?: number;
	} = $props();

	const c = $derived(size / 2);
	const r = $derived(size / 2 - 46);
	const ang = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
	const pt = (i: number, v: number) => [c + Math.cos(ang(i)) * r * (v / 100), c + Math.sin(ang(i)) * r * (v / 100)];
	const poly = (vals: number[]) => vals.map((v, i) => pt(i, Math.max(0, Math.min(100, v))).join(',')).join(' ');
	const anchor = (i: number) => {
		const x = Math.cos(ang(i));
		return Math.abs(x) < 0.2 ? 'middle' : x > 0 ? 'start' : 'end';
	};
</script>

<div class="wrap">
	<svg viewBox="0 0 {size} {size}" role="img" aria-label="Radar chart">
		{#each Array.from({ length: rings }, (_, k) => k + 1) as k (k)}
			<polygon class="ring" points={poly(axes.map(() => (k / rings) * 100))} />
		{/each}
		{#each axes as a, i (a)}
			<line class="spoke" x1={c} y1={c} x2={pt(i, 100)[0]} y2={pt(i, 100)[1]} />
			<text class="lab" x={pt(i, 100)[0] + Math.cos(ang(i)) * 10} y={pt(i, 100)[1] + Math.sin(ang(i)) * 10 + 3} text-anchor={anchor(i)}>{a}</text>
		{/each}
		{#each series as s (s.name)}
			<polygon points={poly(s.values)} fill={s.color} fill-opacity={s.dashed ? 0.05 : 0.22} stroke={s.color} stroke-width="2" stroke-dasharray={s.dashed ? '5 4' : undefined}>
				<title>{s.name}</title>
			</polygon>
			{#each s.values as v, i (i)}
				<circle cx={pt(i, Math.max(0, Math.min(100, v)))[0]} cy={pt(i, Math.max(0, Math.min(100, v)))[1]} r="3" fill={s.color}><title>{s.name} · {axes[i]}: {Math.round(v)}</title></circle>
			{/each}
		{/each}
	</svg>
	<ul class="legend">
		{#each series as s (s.name)}
			<li><i style:background={s.color} class:dash={s.dashed}></i>{s.name}</li>
		{/each}
	</ul>
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	svg {
		width: 100%;
		max-width: 340px;
		height: auto;
		overflow: visible;
	}
	.ring {
		fill: none;
		stroke: rgba(255, 255, 255, 0.12);
	}
	.spoke {
		stroke: rgba(255, 255, 255, 0.12);
	}
	.lab {
		font-size: 10px;
		font-weight: 600;
		fill: rgba(255, 255, 255, 0.75);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px 14px;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 11px;
		color: var(--text-2);
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.legend i {
		width: 10px;
		height: 10px;
		border-radius: 3px;
	}
	.legend i.dash {
		opacity: 0.6;
	}
</style>

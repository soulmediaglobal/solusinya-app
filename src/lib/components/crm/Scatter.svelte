<script lang="ts">
	let {
		points,
		xLabel,
		yLabel,
		height = 280,
		fx = (n: number) => String(Math.round(n)),
		fy = (n: number) => String(Math.round(n))
	}: {
		points: { x: number; y: number; r: number; color: string; label: string }[];
		xLabel: string;
		yLabel: string;
		height?: number;
		fx?: (n: number) => string;
		fy?: (n: number) => string;
	} = $props();

	const W = 640;
	const L = 52;
	const B = 30;
	const T = 24;
	const mx = $derived(Math.max(1, ...points.map((p) => p.x)) * 1.05);
	const my = $derived(Math.max(1, ...points.map((p) => p.y)) * 1.05);
	const X = (v: number) => L + (v / mx) * (W - L - 10);
	const Y = (v: number) => T + (1 - v / my) * (height - T - B);
	const ticks = [0, 0.25, 0.5, 0.75, 1];
</script>

<svg viewBox="0 0 {W} {height}" role="img" aria-label="Scatter chart" style:height="auto">
	{#each ticks as t (t)}
		<line class="grid" x1={L} x2={W - 10} y1={Y(my * t)} y2={Y(my * t)} />
		<text class="tick" x={L - 6} y={Y(my * t) + 3} text-anchor="end">{fy(my * t)}</text>
		<line class="grid v" x1={X(mx * t)} x2={X(mx * t)} y1={T} y2={height - B} />
		<text class="tick" x={X(mx * t)} y={height - B + 14} text-anchor="middle">{fx(mx * t)}</text>
	{/each}
	{#each points as p (p.label)}
		<circle cx={X(p.x)} cy={Y(p.y)} r={p.r} fill={p.color} fill-opacity="0.7" stroke={p.color}><title>{p.label}</title></circle>
	{/each}
	<text class="axis" x={W / 2} y={height - 2} text-anchor="middle">{xLabel}</text>
	<text class="axis" x="10" y="10" text-anchor="start">{yLabel}</text>
</svg>

<style>
	svg {
		width: 100%;
		display: block;
	}
	.grid {
		stroke: rgba(255, 255, 255, 0.08);
	}
	.tick {
		font-size: 10px;
		fill: rgba(255, 255, 255, 0.55);
	}
	.axis {
		font-size: 10px;
		font-weight: 700;
		fill: var(--copper-soft);
	}
</style>

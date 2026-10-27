<script lang="ts">
	let {
		points,
		color = '#bd784e',
		height = 150,
		format = (n: number) => String(Math.round(n)),
		area = true,
		ticks = 4
	}: {
		points: { label: string; v: number }[];
		color?: string;
		height?: number;
		format?: (n: number) => string;
		area?: boolean;
		ticks?: number;
	} = $props();

	const W = 600;
	const padL = 44;
	const padB = 20;
	const padT = 8;
	const max = $derived(Math.max(1, ...points.map((p) => p.v)));
	const niceMax = $derived(max);
	const x = (i: number) => padL + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - padL - 6));
	const y = (v: number) => padT + (1 - v / niceMax) * (height - padT - padB);
	const line = $derived(points.map((p, i) => `${x(i)},${y(p.v)}`).join(' '));
	const areaPath = $derived(points.length ? `M${x(0)},${y(0)} L${line.replaceAll(' ', ' L')} L${x(points.length - 1)},${y(0)} Z` : '');
	const yTicks = $derived(Array.from({ length: ticks + 1 }, (_, k) => (niceMax * k) / ticks));
	const xLabels = $derived(points.length > 6 ? [0, Math.floor(points.length / 2), points.length - 1] : points.map((_, i) => i));
</script>

<svg viewBox="0 0 {W} {height}" role="img" aria-label="Line chart" preserveAspectRatio="none" style:height="{height}px">
	{#each yTicks as t (t)}
		<line class="grid" x1={padL} x2={W - 6} y1={y(t)} y2={y(t)} />
		<text class="tick" x={padL - 6} y={y(t) + 3} text-anchor="end">{format(t)}</text>
	{/each}
	{#if area}<path d={areaPath} fill={color} fill-opacity="0.18" />{/if}
	<polyline points={line} fill="none" stroke={color} stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
	{#each points as p, i (i)}
		<circle cx={x(i)} cy={y(p.v)} r="3" fill={color}><title>{p.label}: {format(p.v)}</title></circle>
	{/each}
	{#each xLabels as i (i)}
		<text class="tick" x={x(i)} y={height - 4} text-anchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{points[i]?.label}</text>
	{/each}
</svg>

<style>
	svg {
		width: 100%;
		display: block;
		overflow: visible;
	}
	.grid {
		stroke: rgba(255, 255, 255, 0.1);
		stroke-dasharray: 3 4;
	}
	.tick {
		font-size: 10px;
		fill: rgba(255, 255, 255, 0.55);
	}
</style>

<script lang="ts">
	let {
		segments,
		big = '',
		small = '',
		size = 190,
		format = (n: number) => String(n)
	}: {
		segments: { label: string; value: number; color: string }[];
		big?: string;
		small?: string;
		size?: number;
		format?: (n: number) => string;
	} = $props();

	const total = $derived(segments.reduce((a, s) => a + s.value, 0) || 1);
	const R = 42;
	const C = 2 * Math.PI * R;
	const arcs = $derived(
		segments.reduce<{ s: (typeof segments)[number]; len: number; off: number }[]>((acc, s) => {
			const off = acc.length ? acc[acc.length - 1].off + acc[acc.length - 1].len : 0;
			return [...acc, { s, len: (s.value / total) * C, off }];
		}, [])
	);
</script>

<div class="wrap">
	<svg viewBox="0 0 100 100" style:width="{size}px" style:height="{size}px" role="img" aria-label="Donut chart">
		<circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="13" />
		{#each arcs as a (a.s.label)}
			<circle cx="50" cy="50" r={R} fill="none" stroke={a.s.color} stroke-width="13" stroke-dasharray="{Math.max(0, a.len - 0.8)} {C - Math.max(0, a.len - 0.8)}" stroke-dashoffset={-a.off} transform="rotate(-90 50 50)">
				<title>{a.s.label}: {format(a.s.value)} ({Math.round((a.s.value / total) * 100)}%)</title>
			</circle>
		{/each}
		{#if big}<text x="50" y="50" text-anchor="middle" class="big">{big}</text>{/if}
		{#if small}<text x="50" y="61" text-anchor="middle" class="small">{small}</text>{/if}
	</svg>
	<ul class="legend">
		{#each segments as s (s.label)}
			<li><i style:background={s.color}></i><span>{s.label}</span><b>{Math.round((s.value / total) * 100)}%</b></li>
		{/each}
	</ul>
</div>

<style>
	.wrap {
		display: flex;
		align-items: center;
		gap: 18px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.big {
		font-size: 11px;
		font-weight: 800;
		fill: #fff;
	}
	.small {
		font-size: 4.6px;
		fill: rgba(255, 255, 255, 0.6);
	}
	.legend {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 140px;
	}
	.legend li {
		display: grid;
		grid-template-columns: 10px 1fr auto;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-2);
	}
	.legend i {
		width: 10px;
		height: 10px;
		border-radius: 3px;
	}
	.legend b {
		color: #fff;
	}
</style>

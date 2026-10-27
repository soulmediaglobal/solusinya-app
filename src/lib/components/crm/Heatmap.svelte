<script lang="ts">
	/** Grid of cells shaded by value. Used for day × hour and for the outlet crossover matrix. */
	let {
		rows,
		cols,
		data,
		showValues = false,
		unit = '',
		cell = 22
	}: {
		rows: string[];
		cols: string[];
		data: number[][];
		showValues?: boolean;
		unit?: string;
		cell?: number;
	} = $props();

	const max = $derived(Math.max(1, ...data.flat()));
	const shade = (n: number) => (n <= 0 ? 'rgba(255,255,255,0.05)' : `rgba(189,120,78,${(0.15 + 0.85 * (n / max)).toFixed(3)})`);
</script>

<div class="scroll">
	<table style:--cell="{cell}px">
		<thead>
			<tr><th></th>{#each cols as c (c)}<th>{c}</th>{/each}</tr>
		</thead>
		<tbody>
			{#each rows as r, i (r)}
				<tr>
					<th class="row">{r}</th>
					{#each cols as c, j (c)}
						<td style:background={shade(data[i][j])} title="{r} · {c}: {data[i][j]}{unit}">{#if showValues}{data[i][j]}{/if}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroll {
		overflow-x: auto;
	}
	table {
		border-collapse: separate;
		border-spacing: 3px;
		margin: 0 auto;
	}
	th {
		font-size: 9px;
		font-weight: 600;
		color: var(--text-3);
		text-align: center;
	}
	th.row {
		padding-right: 6px;
		text-align: right;
		white-space: nowrap;
	}
	td {
		min-width: var(--cell);
		height: var(--cell);
		border-radius: 5px;
		font-size: 10px;
		font-weight: 700;
		text-align: center;
		color: #fff;
	}
</style>

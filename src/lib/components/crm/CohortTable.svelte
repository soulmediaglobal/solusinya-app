<script lang="ts">
	let { cohorts }: { cohorts: { month: string; size: number; retained: (number | null)[] }[] } = $props();
	const label = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
	const shade = (p: number) => `rgba(127,185,138,${(0.12 + 0.78 * p).toFixed(3)})`;
</script>

<div class="scroll">
	<table>
		<thead>
			<tr><th>Joined</th><th>Members</th>{#each [0, 1, 2, 3, 4, 5] as k (k)}<th>{k === 0 ? 'Month 0' : '+' + k}</th>{/each}</tr>
		</thead>
		<tbody>
			{#each cohorts as c (c.month)}
				<tr>
					<th class="row">{label(c.month)}</th>
					<td class="size">{c.size}</td>
					{#each c.retained as n, k (k)}
						{#if n === null}
							<td class="na"></td>
						{:else}
							{@const p = c.size ? n / c.size : 0}
							<td style:background={shade(p)} title="{n} of {c.size} members shopped">{Math.round(p * 100)}%</td>
						{/if}
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
		width: 100%;
		border-collapse: separate;
		border-spacing: 3px;
		font-size: 11px;
	}
	th {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-3);
		padding: 0 4px 4px;
		white-space: nowrap;
	}
	th.row {
		text-align: left;
		color: var(--text-2);
		font-size: 11px;
		letter-spacing: 0;
		text-transform: none;
	}
	td {
		min-width: 44px;
		height: 28px;
		border-radius: 6px;
		text-align: center;
		font-weight: 700;
		color: #fff;
	}
	td.size {
		background: none;
		color: var(--text-2);
	}
	td.na {
		background: rgba(255, 255, 255, 0.03);
	}
</style>

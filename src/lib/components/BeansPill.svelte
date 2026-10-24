<script lang="ts">
	import Icon from './Icon.svelte';
	let { beans }: { beans: number } = $props();
</script>

<a class="pill" href="/stamps"><Icon name="bean" size={14} /> <b>{beans.toLocaleString('id-ID')}</b> <small>beans</small></a>

<style>
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid rgba(189, 120, 78, 0.7);
		background: rgba(9, 7, 5, 0.7);
		color: var(--copper-light);
		text-decoration: none;
	}
	b {
		font-size: 14px;
		font-weight: 800;
		color: #fff;
	}
	small {
		font-size: 10px;
		font-weight: 700;
		color: var(--text-2);
	}
</style>

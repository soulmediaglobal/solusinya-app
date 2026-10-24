<script lang="ts">
	let { title, back, sub = '' }: { title: string; back: string; sub?: string } = $props();
</script>

<header>
	<a class="back" href={back} aria-label="Back">←</a>
	<h1>{title}</h1>
</header>
{#if sub}<p class="sub">{sub}</p>{/if}

<style>
	header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 40px;
	}
	.back {
		position: absolute;
		left: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: rgba(9, 7, 5, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		text-decoration: none;
	}
	h1 {
		margin: 0;
		padding: 0 48px;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.04em;
		text-align: center;
		line-height: 1.1;
	}
	.sub {
		margin: 14px 0 0;
		text-align: center;
		font-size: 12px;
		color: var(--text-2);
	}
</style>

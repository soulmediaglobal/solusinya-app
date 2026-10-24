<script lang="ts">
	let {
		height = 300,
		back = null,
		logo = true,
		logoSize = 'sm'
	}: { height?: number; back?: string | null; logo?: boolean; logoSize?: 'sm' | 'lg' } = $props();
</script>

<div class="hero" style:height="{height}px" aria-hidden="true">
	<img src="/img/bar.jpg" alt="" />
	<div class="fade"></div>
	<div class="top"></div>
</div>
{#if back}
	<a class="back" href={back} aria-label="Back">←</a>
{/if}
{#if logo}
	<div class="ic logo" class:lg={logoSize === 'lg'} role="img" aria-label="Solu Club logo"></div>
{/if}

<style>
	.hero {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		overflow: hidden;
		pointer-events: none;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 62% 50%;
		transform: scaleX(-1);
	}
	.fade {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(9, 7, 5, 0.45) 0%, rgba(9, 7, 5, 0.3) 45%, #090705 100%);
	}
	.top {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 130px;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.38) 55%, rgba(0, 0, 0, 0) 100%);
	}
	.back {
		position: absolute;
		left: 24px;
		top: 24px;
		z-index: 2;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: rgba(9, 7, 5, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-size: 18px;
		text-decoration: none;
	}
	.logo {
		position: absolute;
		left: 50%;
		top: 20px;
		width: 48px;
		height: 61px;
		margin-left: -24px;
		background: var(--copper);
		z-index: 1;
	}
	.logo.lg {
		width: 80px;
		height: 102px;
		margin-left: -40px;
		top: 44px;
	}
</style>

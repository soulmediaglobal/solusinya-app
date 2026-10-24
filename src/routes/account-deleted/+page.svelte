<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
</script>

<Screen top={246}>
	<div class="icon">
		<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
	</div>
	<h1 class="title">Account deleted</h1>
	<p class="sub">Thank you for being part of Solu Club.<br />You are welcome back anytime.</p>
	<div class="grow"></div>
	<Button href="/">Back to start</Button>
</Screen>

<style>
	.icon {
		position: absolute;
		left: 0;
		right: 0;
		top: 150px;
		margin: 0 auto;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		border: 1px solid rgba(189, 120, 78, 0.7);
		background: rgba(189, 120, 78, 0.18);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.grow {
		flex: 1;
	}
</style>

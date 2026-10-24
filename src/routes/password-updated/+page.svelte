<script lang="ts">
	import Screen from '#lib/components/Screen.svelte';
	import Button from '#lib/components/Button.svelte';
</script>

<Screen heroHeight={360} top={150}>
	<div class="check" aria-hidden="true">
		<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
	</div>
	<h1 class="title">Password updated</h1>
	<p class="sub">You can now sign in with your new password.</p>
	<div class="spacer"></div>
	<Button href="/sign-in">Back to sign in</Button>
</Screen>

<style>
	.check {
		align-self: center;
		margin-top: 0;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #e0a073, #bd784e 58%, #83472c);
		color: #14100c;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 30px rgba(189, 120, 78, 0.5);
		margin-bottom: 10px;
	}
	.spacer {
		flex: 1;
		min-height: 24px;
	}
	:global(.screen .body > :last-child) {
		margin-bottom: calc(36px + env(safe-area-inset-bottom));
	}
</style>

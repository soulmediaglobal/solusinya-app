<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '#lib/components/Button.svelte';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (session.user) goto('/home', { replaceState: true });
	});
</script>

<main class="welcome">
	<img class="photo" src="/img/bar.jpg" alt="Coffee shop bar with warm pendant lights" />
	<div class="shade"></div>
	<div class="topshade"><div class="ic logo" role="img" aria-label="Solu Club logo"></div></div>

	<section class="copy">
		<div class="eyebrow">MEMBERSHIP PROGRAM</div>
		<h1><span class="b">SOLU</span><span class="r">CLUB</span></h1>
		<p>Collect a stamp with every transaction, and earn upgrades and free drinks.</p>
	</section>

	<section class="actions">
		<Button href="/sign-up">Join Solu Club</Button>
		<div class="free">Free · takes 1 minute</div>
		<div class="foot-link">Already a member? <a href="/sign-in">Sign in</a></div>
	</section>
</main>

<style>
	.welcome {
		position: relative;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: 0 28px calc(44px + env(safe-area-inset-bottom));
		overflow: hidden;
	}
	@media (min-width: 480px) {
		.welcome {
			min-height: min(860px, calc(100dvh - 48px));
		}
	}
	.photo {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 62% 50%;
		transform: scaleX(-1);
	}
	.shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(9, 7, 5, 0.45) 0%, rgba(9, 7, 5, 0.1) 30%, rgba(9, 7, 5, 0.7) 60%, #090705 88%);
	}
	.topshade {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 190px;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.38) 55%, rgba(0, 0, 0, 0) 100%);
	}
	.logo {
		position: absolute;
		left: 50%;
		top: 44px;
		width: 80px;
		height: 102px;
		margin-left: -40px;
		background: var(--copper);
	}
	.copy,
	.actions {
		position: relative;
		z-index: 1;
	}
	.copy {
		text-align: center;
		margin-bottom: 36px;
	}
	.eyebrow {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.3em;
		padding-left: 0.3em;
		color: var(--copper-light);
	}
	h1 {
		margin: 22px 0 0;
		font-size: 54px;
		letter-spacing: -0.06em;
		line-height: 1;
		white-space: nowrap;
	}
	.b {
		font-weight: 800;
	}
	.r {
		font-weight: 400;
	}
	p {
		margin: 22px 0 0;
		font-size: 15px;
		line-height: 24px;
		color: rgba(255, 255, 255, 0.85);
	}
	.actions {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.free {
		text-align: center;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: rgba(255, 255, 255, 0.7);
	}
	.foot-link {
		margin-top: 4px;
		text-align: center;
		font-size: 13px;
		color: var(--text-2);
	}
	.foot-link a {
		color: var(--copper-light);
		font-weight: 700;
		text-decoration: none;
	}
</style>

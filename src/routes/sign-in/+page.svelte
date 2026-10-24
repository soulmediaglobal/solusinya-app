<script lang="ts">
	import { goto } from '$app/navigation';
	import Screen from '#lib/components/Screen.svelte';
	import Field from '#lib/components/Field.svelte';
	import Button from '#lib/components/Button.svelte';
	import { auth } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!username.trim() || !password) {
			error = 'Enter your username and password.';
			return;
		}
		busy = true;
		try {
			session.set(await auth.signIn(username, password));
			await goto('/home', { replaceState: true });
		} catch {
			error = 'Username or password is incorrect.';
		} finally {
			busy = false;
		}
	}
</script>

<Screen back="/" heroHeight={360} top={228}>
	<form onsubmit={submit} class="form" novalidate>
		<h1 class="title">Welcome back</h1>
		<p class="sub">Sign in to see your stamps and rewards.</p>
		<Field label="Username" bind:value={username} placeholder="@yourname" autocomplete="username" autocapitalize="none" autocorrect="off" />
		<Field label="Password" bind:value={password} eye placeholder="Your password" autocomplete="current-password" error={error} />
		<div class="forgot"><a class="link" href="/forgot">Forgot password?</a></div>
		<div class="spacer"></div>
		<Button type="submit" loading={busy}>Sign in</Button>
		<div class="foot-link">New here? <a href="/sign-up">Join Solu Club</a></div>
	</form>
</Screen>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
		padding-bottom: calc(36px + env(safe-area-inset-bottom));
	}
	.spacer {
		flex: 1;
		min-height: 24px;
	}
	.forgot {
		text-align: right;
		font-size: 12px;
	}
</style>

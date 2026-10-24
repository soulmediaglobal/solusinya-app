<script lang="ts">
	import { goto } from '$app/navigation';
	import Screen from '#lib/components/Screen.svelte';
	import Field from '#lib/components/Field.svelte';
	import Button from '#lib/components/Button.svelte';
	import { auth } from '#lib/services';

	let identifier = $state('');
	let error = $state('');
	let busy = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!identifier.trim()) {
			error = 'Enter your username or email.';
			return;
		}
		busy = true;
		try {
			const { maskedEmail } = await auth.requestPasswordReset(identifier);
			await goto(`/verify?purpose=reset&to=${encodeURIComponent(maskedEmail)}`);
		} finally {
			busy = false;
		}
	}
</script>

<Screen back="/sign-in" heroHeight={360} top={228}>
	<form onsubmit={submit} class="form" novalidate>
		<h1 class="title">Forgot password?</h1>
		<p class="sub">Enter your username or email and we will<br />send you a 6-digit code.</p>
		<Field label="Username or email" bind:value={identifier} placeholder="Username or email" autocapitalize="none" autocorrect="off" {error} />
		<div class="spacer"></div>
		<Button type="submit" loading={busy}>Send code</Button>
		<div class="foot-link">Remembered it? <a href="/sign-in">Sign in</a></div>
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
</style>

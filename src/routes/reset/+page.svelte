<script lang="ts">
	import { goto } from '$app/navigation';
	import Screen from '#lib/components/Screen.svelte';
	import Field from '#lib/components/Field.svelte';
	import Button from '#lib/components/Button.svelte';
	import { auth } from '#lib/services';
	import { passwordError } from '#lib/validation';

	let password = $state('');
	let confirm = $state('');
	let errors = $state<Record<string, string>>({});
	let busy = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const next: Record<string, string> = {};
		next.password = passwordError(password);
		if (!next.password && confirm !== password) next.confirm = 'Passwords do not match.';
		errors = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
		if (Object.keys(errors).length) return;
		busy = true;
		try {
			await auth.resetPassword(password);
			await goto('/password-updated', { replaceState: true });
		} catch {
			errors = { form: 'This reset session has ended. Please request a new code.' };
		} finally {
			busy = false;
		}
	}
</script>

<Screen back="/verify" heroHeight={360} top={228}>
	<form onsubmit={submit} class="form" novalidate>
		<h1 class="title">Create new password</h1>
		<p class="sub">Your code is verified. Choose a new password<br />for your Solu Club account.</p>
		<Field label="New password" bind:value={password} eye placeholder="At least 8 characters" autocomplete="new-password" error={errors.password} />
		<Field label="Confirm new password" bind:value={confirm} eye placeholder="Re-enter your new password" autocomplete="new-password" error={errors.confirm} hint="Use at least 8 characters. It must be different from your previous password." />
		{#if errors.form}<div class="err" role="alert">{errors.form} <a class="link" href="/forgot">Start over</a></div>{/if}
		<div class="spacer"></div>
		<Button type="submit" loading={busy}>Update password</Button>
		<div class="foot-link">Changed your mind? <a href="/sign-in">Sign in</a></div>
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
	.err {
		font-size: 12px;
		color: var(--error);
		text-align: center;
	}
</style>

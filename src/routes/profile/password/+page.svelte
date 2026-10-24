<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import { MIN_PASSWORD } from '#lib/config';
	import { auth } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';
	import { AppError } from '#lib/types';
	import { untrack } from 'svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	let current = $state('');
	let next = $state('');
	let again = $state('');
	let errs = $state<{ cur?: string; next?: string; again?: string; form?: string }>({});
	let busy = $state(false);
	let done = $state(false);

	// Editing a field clears its own message (untrack: setting errors must not re-trigger these effects).
	$effect(() => {
		void current;
		untrack(() => (errs = { ...errs, cur: undefined }));
	});
	$effect(() => {
		void next;
		void again;
		untrack(() => (errs = { ...errs, next: undefined, again: undefined }));
	});

	async function submit() {
		if (busy) return;
		const e: typeof errs = {};
		if (!current) e.cur = 'Enter your current password.';
		if (next.length < MIN_PASSWORD) e.next = `Use at least ${MIN_PASSWORD} characters.`;
		else if (next === current) e.next = 'Choose a password different from the current one.';
		if (again !== next) e.again = 'Passwords do not match.';
		errs = e;
		if (Object.keys(e).length) return;
		busy = true;
		try {
			await auth.changePassword(current, next);
			done = true;
		} catch (x) {
			if (x instanceof AppError && x.code === 'wrong_password') errs = { cur: 'That password is not correct.' };
			else if (x instanceof AppError && x.code === 'weak_password') errs = { next: 'That password is too weak. Try a longer one.' };
			else errs = { form: 'Could not update your password. Please try again.' };
		} finally {
			busy = false;
		}
	}
</script>

{#if session.user}
	<AppScreen nav={false}>
		<div class="page">
			<BackHeader title="Change password" back="/profile" />
			{#if done}
				<div class="okbox" role="status">
					<span class="tick"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
					<h2>Password updated</h2>
					<p>You stay signed in on this device.</p>
					<Button href="/profile">Back to profile</Button>
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); submit(); }}>
					<Field label="Current password" eye bind:value={current} error={errs.cur} autocomplete="current-password" />
					<Field label="New password" eye bind:value={next} error={errs.next} hint="Use at least {MIN_PASSWORD} characters. You will stay signed in on this device." autocomplete="new-password" />
					<Field label="Confirm new password" eye bind:value={again} error={errs.again} autocomplete="new-password" />
					<div class="forgot"><a href="/forgot">Forgot your current password?</a></div>
					{#if errs.form}<div class="form-err" role="alert">{errs.form}</div>{/if}
					<div class="actions">
						<Button type="submit" loading={busy}>Update password</Button>
						<Button variant="ghost" href="/profile">Cancel</Button>
					</div>
				</form>
			{/if}
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 28px 36px;
	}
	form {
		margin-top: 28px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.forgot {
		text-align: center;
		font-size: 13px;
	}
	.forgot a {
		color: var(--copper-light);
		font-weight: 700;
		text-decoration: none;
	}
	.form-err {
		text-align: center;
		font-size: 12px;
		color: var(--error);
	}
	.actions {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.okbox {
		margin-top: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		text-align: center;
	}
	.okbox :global(.btn) {
		margin-top: 18px;
	}
	.tick {
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
	h2 {
		margin: 8px 0 0;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.04em;
	}
	p {
		margin: 0;
		font-size: 13px;
		color: var(--text-2);
	}
</style>

<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import Screen from '#lib/components/Screen.svelte';
	import Field from '#lib/components/Field.svelte';
	import Button from '#lib/components/Button.svelte';
	import { OUTLETS, type OutletCode } from '#lib/config';
	import { auth } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';
	import { AppError } from '#lib/types';
	import { emailError, passwordError, usernameError } from '#lib/validation';

	let username = $state('');
	let fullName = $state('');
	let email = $state('');
	let outlet = $state<OutletCode | ''>('');
	let whatsapp = $state('');
	let password = $state('');
	let confirm = $state('');
	let agree = $state(false);
	let errors = $state<Record<string, string>>({});
	let busy = $state(false);
	let usernameNote = $state('');

	// Live availability check, debounced.
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const u = username;
		clearTimeout(timer);
		usernameNote = '';
		if (usernameError(u)) return;
		timer = setTimeout(async () => {
			const ok = await auth.usernameAvailable(u);
			if (u === username) {
				if (ok) usernameNote = '';
				else errors.username = 'This username is taken.';
			}
		}, 350);
		return () => clearTimeout(timer);
	});

	// Editing a field clears its own error message.
	function clearOn(key: string, read: () => unknown) {
		$effect(() => {
			read();
			untrack(() => {
				if (errors[key]) {
					const { [key]: _drop, ...rest } = errors;
					errors = rest;
				}
			});
		});
	}
	clearOn('username', () => username);
	clearOn('fullName', () => fullName);
	clearOn('email', () => email);
	clearOn('outlet', () => outlet);
	clearOn('password', () => password);
	clearOn('confirm', () => confirm);
	clearOn('agree', () => agree);

	function validate() {
		const e: Record<string, string> = {};
		e.username = usernameError(username);
		if (!fullName.trim()) e.fullName = 'Enter your full name.';
		e.email = emailError(email);
		if (!outlet) e.outlet = 'Choose your registered outlet.';
		e.password = passwordError(password);
		if (!e.password && confirm !== password) e.confirm = 'Passwords do not match.';
		if (!agree) e.agree = 'Please agree to the Terms and Privacy Policy.';
		errors = Object.fromEntries(Object.entries(e).filter(([, v]) => v));
		return Object.keys(errors).length === 0;
	}

	async function submit(ev: SubmitEvent) {
		ev.preventDefault();
		if (!validate()) return;
		busy = true;
		try {
			const profile = await auth.signUp({
				username,
				fullName,
				email,
				outletCode: outlet as OutletCode,
				whatsapp,
				password
			});
			session.set(profile);
			await goto('/home', { replaceState: true });
		} catch (err) {
			if (err instanceof AppError && err.code === 'username_taken') errors = { ...errors, username: 'This username is taken.' };
			else if (err instanceof AppError && err.code === 'email_taken') errors = { ...errors, email: 'This email is already registered.' };
			else errors = { ...errors, form: 'Something went wrong. Please try again.' };
		} finally {
			busy = false;
		}
	}
</script>

<Screen back="/" heroHeight={210} top={92}>
	<form onsubmit={submit} class="form" novalidate>
		<h1 class="title">Create your membership</h1>
		<Field label="Username" bind:value={username} placeholder="@yourname" autocomplete="username" autocapitalize="none" autocorrect="off" error={errors.username} />
		<Field label="Full name" bind:value={fullName} placeholder="As on your ID" autocomplete="name" error={errors.fullName} />
		<Field label="Email" bind:value={email} type="email" placeholder="you@email.com" autocomplete="email" autocapitalize="none" error={errors.email} />
		<div>
			<label class="select" class:err={!!errors.outlet}>
				<span class="lab">Registered outlet</span>
				<select bind:value={outlet} aria-label="Registered outlet">
					<option value="" disabled>Choose an outlet</option>
					{#each OUTLETS as o (o.code)}
						<option value={o.code}>{o.name}</option>
					{/each}
				</select>
				<span class="caret" aria-hidden="true">▾</span>
			</label>
			{#if errors.outlet}<div class="msg">{errors.outlet}</div>{/if}
		</div>
		<Field label="WhatsApp · optional" bind:value={whatsapp} type="tel" placeholder="0812 3456 7890" autocomplete="tel" />
		<Field label="Password" bind:value={password} eye placeholder="At least 8 characters" autocomplete="new-password" error={errors.password} />
		<Field label="Confirm password" bind:value={confirm} eye placeholder="Re-enter your password" autocomplete="new-password" error={errors.confirm} />
		<label class="agree">
			<input type="checkbox" bind:checked={agree} />
			<span>I agree to the <b>Terms</b> and <b>Privacy Policy</b>.</span>
		</label>
		{#if errors.agree}<div class="msg">{errors.agree}</div>{/if}
		{#if errors.form}<div class="msg">{errors.form}</div>{/if}
		<div class="gap"></div>
		<Button type="submit" loading={busy}>Create account</Button>
		<div class="foot-link">Already a member? <a href="/sign-in">Sign in</a></div>
	</form>
</Screen>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-bottom: calc(36px + env(safe-area-inset-bottom));
	}
	.form :global(.title) {
		margin-bottom: 8px;
	}
	.select {
		position: relative;
		display: block;
		height: 54px;
		padding: 8px 16px 0;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
	}
	.select.err {
		border-color: var(--error);
	}
	.lab {
		display: block;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
		text-transform: uppercase;
	}
	select {
		width: 100%;
		height: 26px;
		margin-top: 1px;
		padding: 0;
		appearance: none;
		-webkit-appearance: none;
		border: 0;
		outline: none;
		background: transparent;
		color: #fff;
		font-size: 15px;
		font-weight: 600;
	}
	select option {
		color: #111;
	}
	.caret {
		position: absolute;
		right: 16px;
		top: 19px;
		font-size: 13px;
		color: var(--copper-soft);
		pointer-events: none;
	}
	.agree {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		margin-top: 6px;
		font-size: 11px;
		line-height: 17px;
		color: rgba(255, 255, 255, 0.7);
	}
	.agree input {
		width: 16px;
		height: 16px;
		margin: 1px 0 0;
		accent-color: var(--copper);
		flex: none;
	}
	.agree b {
		color: var(--copper-light);
	}
	.msg {
		margin: 0 4px;
		font-size: 11px;
		line-height: 16px;
		color: var(--error);
	}
	.gap {
		min-height: 12px;
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';
	import Screen from '#lib/components/Screen.svelte';
	import OtpInput from '#lib/components/OtpInput.svelte';
	import Button from '#lib/components/Button.svelte';
	import { OTP_LENGTH, OTP_TTL_MINUTES } from '#lib/config';
	import { auth, isMock } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';
	import { DEMO_OTP } from '#lib/services/mock/auth';
	import type { OtpError, OtpPurpose } from '#lib/types';

	const p = page.url.searchParams.get('purpose');
	const purpose: OtpPurpose = p === 'email' || p === 'signup' ? p : 'reset';
	const to = page.url.searchParams.get('to') ?? 'your email';
	const backHref = purpose === 'email' ? '/profile/edit' : purpose === 'signup' ? '/sign-up' : '/forgot';

	const copy =
		purpose === 'email'
			? { title: 'Verify your new email', note: 'Your current email stays active until you verify.' }
			: purpose === 'signup'
				? { title: 'Verify your email', note: "Can't find it? Check your spam folder." }
				: { title: 'Check your email', note: "Can't find it? Check your spam folder." };

	let code = $state('');
	let error = $state<OtpError | ''>('');
	let busy = $state(false);
	let tried = '';
	let seconds = $state(48);
	let tick: ReturnType<typeof setInterval>;

	onMount(() => {
		tick = setInterval(() => seconds > 0 && seconds--, 1000);
	});
	onDestroy(() => clearInterval(tick));

	async function verify() {
		if (code.length !== OTP_LENGTH || busy) return;
		busy = true;
		tried = code;
		const res = await auth.verifyOtp(purpose, code);
		busy = false;
		if (res.ok) {
			if (purpose === 'signup' || purpose === 'email') session.set(await auth.currentUser());
			await goto(purpose === 'reset' ? '/reset' : '/home', { replaceState: true });
		} else {
			error = res.error;
		}
	}
	async function resend() {
		await auth.resendOtp(purpose);
		code = '';
		tried = '';
		error = '';
		seconds = 48;
	}
	// Editing the code clears a "wrong code" message; the digits stay so the user can fix one.
	$effect(() => {
		if (code !== tried && error === 'wrong') error = '';
	});
</script>

<Screen back={backHref} heroHeight={360} top={206}>
	<div class="head">
		<h1 class="title">{copy.title}</h1>
		<p class="sub">We sent a 6-digit code to<br /><b>{to}</b></p>
	</div>
	<div class="otp"><OtpInput bind:value={code} invalid={error === 'wrong'} oncomplete={verify} /></div>

	{#if error === 'wrong'}
		<div class="status err" role="alert">That code is incorrect. Please try again.</div>
	{:else if error === 'expired'}
		<div class="status err" role="alert">This code has expired.</div>
	{:else if seconds > 0}
		<div class="status">Resend code in <b>0:{String(seconds).padStart(2, '0')}</b></div>
	{:else}
		<div class="status"><button class="linkbtn" onclick={resend}>Resend code</button></div>
	{/if}
	<div class="note">{copy.note}<br />The code expires in {OTP_TTL_MINUTES} minutes.</div>
	<div class="status"><a class="link" href={backHref}>Wrong email? Change it</a></div>

	{#if isMock && import.meta.env.DEV}
		<div class="dev">Demo only: {DEMO_OTP} is correct, 000000 is expired.</div>
	{/if}

	<div class="grow"></div>
	{#if error === 'expired'}
		<Button onclick={resend}>Send a new code</Button>
	{:else}
		<Button onclick={verify} disabled={code.length !== OTP_LENGTH} loading={busy}>Verify</Button>
	{/if}
	<div class="foot-link">Having trouble? <a href="/profile/help">Contact us</a></div>
</Screen>

<style>
	.head {
		text-align: center;
	}
	.sub {
		margin-top: 14px;
		line-height: 21px;
	}
	.sub b {
		color: #fff;
	}
	.otp {
		margin-top: 40px;
	}
	.status {
		text-align: center;
		font-size: 13px;
		color: var(--text-2);
		margin-top: 6px;
	}
	.status b {
		color: var(--copper-light);
	}
	.status.err {
		color: var(--error);
		font-weight: 700;
	}
	.note {
		text-align: center;
		font-size: 12px;
		line-height: 18px;
		color: rgba(255, 255, 255, 0.55);
	}
	.linkbtn {
		background: none;
		border: 0;
		color: var(--copper-light);
		font-weight: 700;
		font-size: 13px;
		cursor: pointer;
		padding: 0;
	}
	.dev {
		text-align: center;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.35);
	}
	.grow {
		flex: 1;
		min-height: 20px;
	}
	:global(.screen .body > :last-child) {
		margin-bottom: calc(36px + env(safe-area-inset-bottom));
	}
</style>

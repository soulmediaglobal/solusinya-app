<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import { longDate, outletName } from '#lib/format';
	import { auth } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';
	import { AppError } from '#lib/types';
	import { untrack } from 'svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});

	const me = untrack(() => session.user);
	let fullName = $state(me?.fullName ?? '');
	let username = $state(me?.username ?? '');
	let email = $state(me?.email ?? '');
	let whatsapp = $state(me?.whatsapp ?? '');
	let birthday = $state('');
	const locked = Boolean(me?.birthday);
	const today = new Date().toISOString().slice(0, 10);

	let avail = $state<'idle' | 'checking' | 'ok' | 'taken'>('idle');
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const u = username.trim().toLowerCase();
		clearTimeout(timer);
		if (!me || u === me.username || !/^[a-z0-9._]{3,20}$/.test(u)) {
			avail = 'idle';
			return;
		}
		avail = 'checking';
		timer = setTimeout(async () => {
			const ok = await auth.usernameAvailable(u);
			if (u === username.trim().toLowerCase()) avail = ok ? 'ok' : 'taken';
		}, 350);
	});

	let errs = $state<{ name?: string; user?: string; email?: string; wa?: string; bday?: string; form?: string }>({});
	let busy = $state(false);
	let confirmBday = $state(false);

	function validate() {
		const e: typeof errs = {};
		if (!fullName.trim()) e.name = 'Enter your full name.';
		if (!/^[a-z0-9._]{3,20}$/.test(username.trim().toLowerCase())) e.user = 'Use 3 to 20 letters, numbers, dots or underscores.';
		else if (avail === 'taken') e.user = `${username.trim()} is already taken.`;
		if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email address.';
		const digits = whatsapp.replace(/\D/g, '');
		if (whatsapp.trim() && (digits.length < 9 || digits.length > 15)) e.wa = 'Enter a valid WhatsApp number.';
		if (!locked && birthday && birthday > today) e.bday = 'Birthday cannot be in the future.';
		errs = e;
		return Object.keys(e).length === 0;
	}
	function save() {
		if (busy || !validate()) return;
		if (!locked && birthday) confirmBday = true;
		else commit();
	}
	async function commit() {
		confirmBday = false;
		busy = true;
		errs = {};
		try {
			let profile = await auth.updateProfile({ fullName, username, whatsapp });
			if (!locked && birthday) profile = await auth.setBirthday(birthday);
			session.set(profile);
			if (me && email.trim().toLowerCase() !== me.email.toLowerCase()) {
				const { maskedEmail } = await auth.requestEmailChange(email);
				await goto(`/verify?purpose=email&to=${encodeURIComponent(maskedEmail)}`);
				return;
			}
			await goto('/profile', { replaceState: true });
		} catch (e) {
			if (e instanceof AppError && e.code === 'username_taken') {
				avail = 'taken';
				errs = { user: `${username.trim()} is already taken.` };
			} else if (e instanceof AppError && e.code === 'email_taken') errs = { email: 'That email is already registered.' };
			else errs = { form: 'Could not save your changes. Please try again.' };
		} finally {
			busy = false;
		}
	}
	const suggest = $derived(username.trim().toLowerCase().replace(/\.\d+$/, '') + '2');
	const bdayLabel = $derived(birthday ? longDate(birthday + 'T12:00:00') : '');
</script>

{#if me}
	<AppScreen nav={false}>
		<div class="page">
			<BackHeader title="Edit profile" back="/profile" />
			<form onsubmit={(e) => { e.preventDefault(); save(); }}>
				<Field label="Full name" bind:value={fullName} error={errs.name} autocomplete="name" />
				<div>
					<Field label="Username" bind:value={username} error={errs.user} autocapitalize="none" autocomplete="username" />
					{#if !errs.user && avail === 'ok'}<div class="ok">{username.trim().toLowerCase()} is available</div>{/if}
					{#if avail === 'taken' && errs.user}
						<div class="alt">Try <button type="button" onclick={() => (username = suggest)}>{suggest}</button></div>
					{/if}
				</div>
				<Field label="Email" type="email" bind:value={email} error={errs.email} hint="We will send a code to confirm your new email. Your current email stays active until you do." autocomplete="email" />
				<Field label="WhatsApp · for rewards" type="tel" bind:value={whatsapp} error={errs.wa} placeholder="0812 3456 7890" autocomplete="tel" />
				{#if locked && me.birthday}
					<div class="ro">
						<span class="lab">BIRTHDAY</span>
						<span class="val">{longDate(me.birthday + 'T12:00:00')}</span>
						<span class="lock" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>
					</div>
					<div class="note">Birthday is locked. To correct it, contact us from <a href="/profile/help">Help</a>.</div>
				{:else}
					<Field label="Birthday · for rewards" type="date" bind:value={birthday} error={errs.bday} max={today} hint="Used for your yearly birthday reward. It can't be changed after saving." />
				{/if}
				<div class="ro dim">
					<span class="lab">REGISTERED OUTLET</span>
					<span class="val">{outletName(me.outletCode)}</span>
					<span class="lock" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>
				</div>
				<div class="note">Only our team can change your registered outlet.</div>
				{#if errs.form}<div class="form-err" role="alert">{errs.form}</div>{/if}
				<div class="actions">
					<Button type="submit" loading={busy}>Save changes</Button>
					<Button variant="ghost" href="/profile">Cancel</Button>
				</div>
			</form>
		</div>

		{#if confirmBday}
			<Sheet label="Confirm your birthday" onclose={() => (confirmBday = false)}>
				<h2>Confirm your birthday</h2>
				<div class="bd">{bdayLabel}</div>
				<p class="warn">You can't change this after saving. If it's wrong, contact us from Help.</p>
				<Button onclick={commit} loading={busy}>Confirm and save</Button>
				<Button variant="ghost" onclick={() => (confirmBday = false)}>Go back</Button>
			</Sheet>
		{/if}
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
	.ok {
		margin: 6px 4px 0;
		font-size: 11px;
		color: var(--success);
	}
	.alt {
		margin: 4px 4px 0;
		font-size: 11px;
		color: var(--text-3);
	}
	.alt button {
		padding: 0;
		border: 0;
		background: none;
		color: var(--copper-light);
		font-weight: 700;
		font-size: 11px;
		cursor: pointer;
	}
	.ro {
		position: relative;
		height: 54px;
		padding: 8px 16px 0;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.03);
	}
	.lab {
		display: block;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
	}
	.val {
		display: block;
		margin-top: 5px;
		font-size: 15px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.55);
	}
	.lock {
		position: absolute;
		right: 16px;
		top: 19px;
		color: rgba(255, 255, 255, 0.45);
	}
	.note {
		margin: -6px 4px 0;
		font-size: 11px;
		line-height: 16px;
		color: var(--text-3);
	}
	.note a {
		color: var(--copper-light);
		font-weight: 700;
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
	h2 {
		margin: 8px 0 0;
		text-align: center;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.03em;
	}
	.bd {
		text-align: center;
		font-size: 22px;
		font-weight: 800;
		color: var(--copper-light);
	}
	.warn {
		margin: 0 0 6px;
		text-align: center;
		font-size: 12px;
		line-height: 18px;
		color: var(--text-2);
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PhotoHeader from '#lib/components/PhotoHeader.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import { cardFill, longDate } from '#lib/format';
	import { completeness, photoToAvatar } from '#lib/profile';
	import { auth, loyalty } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';
	import { isUsable } from '#lib/vouchers';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});

	let stamps = $state(0);
	let beans = $state(0);
	let rewards = $state(0);
	$effect(() => {
		if (!session.user) return;
		Promise.all([loyalty.balance(), loyalty.vouchers()]).then(([b, v]) => {
			stamps = cardFill(b.stamps);
			beans = b.beans;
			rewards = v.filter((x) => isUsable(x)).length;
		});
	});

	const user = $derived(session.user);
	const first = $derived(user?.fullName.split(' ')[0] ?? '');
	const rest = $derived(user?.fullName.split(' ').slice(1).join(' ') ?? '');
	const comp = $derived(user ? completeness(user) : null);

	let sheet = $state(false);
	let busy = $state(false);
	let err = $state('');
	let camera = $state<HTMLInputElement>();
	let library = $state<HTMLInputElement>();

	async function picked(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		busy = true;
		err = '';
		try {
			session.set(await auth.setAvatar(await photoToAvatar(file)));
			sheet = false;
		} catch {
			err = 'Could not use that photo. Please try another one.';
		} finally {
			busy = false;
		}
	}
	async function removePhoto() {
		busy = true;
		try {
			session.set(await auth.setAvatar(null));
			sheet = false;
		} catch {
			err = 'Could not remove the photo. Please try again.';
		} finally {
			busy = false;
		}
	}
	async function signOut() {
		await session.signOut();
		await goto('/', { replaceState: true });
	}

	const menu = [
		{ href: '/profile/edit', label: 'Edit profile', icon: 'user' },
		{ href: '/profile/social', label: 'Social accounts', icon: 'link' },
		{ href: '/profile/password', label: 'Change password', icon: 'key' },
		{ href: '/profile/terms', label: 'Terms & privacy', icon: 'doc' },
		{ href: '/profile/help', label: 'Help', icon: 'help' }
	] as const;
</script>

{#if user}
	<AppScreen>
		<PhotoHeader height={200} logo={false} />
		<div class="page">
			<button class="avbtn" aria-label="Change profile photo" onclick={() => (sheet = true)}>
				<Avatar name={user.fullName} src={user.avatar} />
				<span class="cam">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg>
				</span>
			</button>
			<div class="who">
				<div class="full"><b>{first}</b> {rest}</div>
				<div class="un">@{user.username}</div>
				<div class="since">Member since {longDate(user.createdAt)}</div>
			</div>

			{#if comp && !comp.complete}
				<a class="incomplete" href="/profile/edit">
					<div class="itx">
						<div class="ir"><b>Complete your profile</b><span>{comp.done} of {comp.total}</span></div>
						<div class="ibar"><i style:width="{(comp.done / comp.total) * 100}%"></i></div>
						<small>Add your {comp.missing.join(' and ')} to redeem rewards</small>
					</div>
					<span class="chev">›</span>
				</a>
			{:else}
				<div class="stats">
					<a href="/stamps"><b>{stamps} / 10</b><small>STAMPS</small></a>
					<a href="/stamps"><b>{beans.toLocaleString('id-ID')}</b><small>BEANS</small></a>
					<a href="/rewards"><b>{rewards}</b><small>REWARDS</small></a>
				</div>
			{/if}

			<nav class="menu">
				{#each menu as m (m.href)}
					<a href={m.href}>
						<span class="mi">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								{#if m.icon === 'user'}<path d="M4 20h4L19 9l-4-4L4 16z" />
								{:else if m.icon === 'link'}<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
								{:else if m.icon === 'key'}<circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" />
								{:else if m.icon === 'doc'}<path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4M10 12h6M10 16h6" />
								{:else}<circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />{/if}
							</svg>
						</span>
						<span class="ml">{m.label}</span>
						<span class="chev">›</span>
					</a>
				{/each}
			</nav>

			<button class="out" onclick={signOut}>Sign out</button>
			<a class="del" href="/profile/delete">Delete account</a>
		</div>

		{#if sheet}
			<Sheet label="Profile photo" onclose={() => (sheet = false)}>
				<h2>Profile photo</h2>
				<p class="hint">Shown on your profile only. The member card stays the same.</p>
				<input bind:this={camera} type="file" accept="image/*" capture="user" hidden onchange={picked} />
				<input bind:this={library} type="file" accept="image/*" hidden onchange={picked} />
				<button class="opt" disabled={busy} onclick={() => camera?.click()}>
					<span class="oi"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg></span>
					Take a photo
				</button>
				<button class="opt" disabled={busy} onclick={() => library?.click()}>
					<span class="oi"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 8" /></svg></span>
					Choose from library
				</button>
				{#if user.avatar}
					<button class="opt rm" disabled={busy} onclick={removePhoto}>
						<span class="oi"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg></span>
						Remove photo
					</button>
				{/if}
				{#if err}<div class="err" role="alert">{err}</div>{/if}
				<button class="cancel" onclick={() => (sheet = false)}>Cancel</button>
			</Sheet>
		{/if}
	</AppScreen>
{/if}

<style>
	.page {
		position: relative;
		z-index: 1;
		padding: 56px 28px 32px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}
	.avbtn {
		align-self: center;
		position: relative;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}
	.cam {
		position: absolute;
		right: -2px;
		bottom: -2px;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 2px solid var(--bg);
		background: linear-gradient(135deg, #a05a37, #83472c);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.who {
		margin-top: 14px;
		text-align: center;
	}
	.full {
		font-size: 24px;
		letter-spacing: -0.045em;
		line-height: 1.1;
	}
	.full b {
		font-weight: 800;
	}
	.un {
		margin-top: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--copper-soft);
	}
	.since {
		margin-top: 6px;
		font-size: 11px;
		color: var(--text-3);
	}
	.stats {
		margin-top: 26px;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.stats a {
		padding: 12px 0;
		text-align: center;
		border-radius: 14px;
		border: 1px solid rgba(189, 120, 78, 0.5);
		background: rgba(189, 120, 78, 0.08);
		color: #fff;
		text-decoration: none;
	}
	.stats b {
		display: block;
		font-size: 19px;
		font-weight: 800;
		letter-spacing: -0.03em;
	}
	.stats small {
		display: block;
		margin-top: 4px;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--copper-soft);
	}
	.incomplete {
		margin-top: 26px;
		padding: 14px 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		border-radius: 14px;
		border: 1px solid rgba(224, 138, 120, 0.55);
		background: rgba(224, 138, 120, 0.1);
		color: #fff;
		text-decoration: none;
	}
	.itx {
		flex: 1;
	}
	.ir {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		font-weight: 800;
	}
	.ir span {
		color: var(--copper-light);
		font-size: 11px;
	}
	.ibar {
		margin-top: 8px;
		height: 5px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.14);
	}
	.ibar i {
		display: block;
		height: 5px;
		border-radius: 3px;
		background: linear-gradient(90deg, #83472c, #e0a073);
	}
	.incomplete small {
		display: block;
		margin-top: 6px;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.65);
	}
	.chev {
		color: var(--copper-light);
		font-size: 16px;
	}
	.menu {
		margin-top: 22px;
	}
	.menu a {
		display: flex;
		align-items: center;
		gap: 14px;
		height: 48px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		text-decoration: none;
	}
	.mi {
		flex: none;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ml {
		flex: 1;
		font-size: 14px;
		font-weight: 700;
	}
	.out {
		margin-top: 28px;
		height: 46px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: transparent;
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}
	.del {
		margin-top: 18px;
		text-align: center;
		font-size: 12px;
		font-weight: 600;
		color: var(--danger);
		text-decoration: none;
	}
	h2 {
		margin: 0;
		text-align: center;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.03em;
	}
	.hint {
		margin: 0 0 6px;
		text-align: center;
		font-size: 12px;
		color: var(--text-3);
	}
	.opt {
		display: flex;
		align-items: center;
		gap: 14px;
		height: 56px;
		padding: 0;
		border: 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		text-align: left;
	}
	.opt:disabled {
		opacity: 0.5;
	}
	.oi {
		flex: none;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.rm {
		color: var(--danger);
	}
	.rm .oi {
		background: rgba(201, 128, 107, 0.15);
		color: var(--danger);
	}
	.err {
		text-align: center;
		font-size: 12px;
		color: var(--error);
	}
	.cancel {
		height: 50px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		background: transparent;
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}
</style>

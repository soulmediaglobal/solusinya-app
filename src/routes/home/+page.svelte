<script lang="ts">
	import { goto } from '$app/navigation';
	import Screen from '#lib/components/Screen.svelte';
	import Button from '#lib/components/Button.svelte';
	import { OUTLETS } from '#lib/config';
	import { loyalty } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	const first = $derived(session.user?.fullName.split(' ')[0] ?? '');
	const outlet = $derived(OUTLETS.find((o) => o.code === session.user?.outletCode)?.name ?? '');

	let balance = $state({ stamps: 0, beans: 0, lifetimeBeans: 0 });
	$effect(() => {
		if (session.user) loyalty.balance().then((b) => (balance = b));
	});

	async function signOut() {
		await session.signOut();
		await goto('/', { replaceState: true });
	}
</script>

{#if session.user}
	<Screen heroHeight={300} top={110}>
		<h1 class="title">Hello, {first}</h1>
		<p class="sub">Home is the next section to build (B6).</p>
		<dl>
			<div><dt>MEMBER ID</dt><dd>{session.user.memberId}</dd></div>
			<div><dt>REGISTERED OUTLET</dt><dd>{outlet}</dd></div>
			<div><dt>USERNAME</dt><dd>@{session.user.username}</dd></div>
			<div><dt>STAMPS · BEANS</dt><dd>{balance.stamps} · {balance.beans}</dd></div>
		</dl>
		{#if session.user.isAdmin}
			<div class="adm"><a class="link" href="/admin">Admin: add transaction</a></div>
		{/if}
		<div class="spacer"></div>
		<Button variant="ghost" onclick={signOut}>Sign out</Button>
	</Screen>
{/if}

<style>
	dl {
		margin: 12px 0 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
		text-align: center;
	}
	dt {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--copper-soft);
	}
	dd {
		margin: 4px 0 0;
		font-size: 15px;
		font-weight: 600;
	}
	.adm {
		text-align: center;
		margin-top: 22px;
		font-size: 13px;
	}
	.spacer {
		flex: 1;
		min-height: 24px;
	}
	:global(.screen .body > :last-child) {
		margin-bottom: calc(36px + env(safe-area-inset-bottom));
	}
</style>

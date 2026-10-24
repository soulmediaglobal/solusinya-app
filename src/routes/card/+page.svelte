<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Qr from '#lib/components/Qr.svelte';
	import { cardFill, longDate, outletName } from '#lib/format';
	import { loyalty } from '#lib/services';
	import type { Balance } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	let balance = $state<Balance>({ stamps: 0, beans: 0, lifetimeBeans: 0 });
	$effect(() => {
		if (session.user) loyalty.balance().then((b) => (balance = b));
	});

	let copied = $state(false);
	async function copyId() {
		try {
			await navigator.clipboard.writeText(session.user?.memberId ?? '');
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* clipboard unavailable: ignore */
		}
	}
	const user = $derived(session.user);
	const first = $derived(user?.fullName.split(' ')[0] ?? '');
	const rest = $derived(user?.fullName.split(' ').slice(1).join(' ') ?? '');
	const fill = $derived(cardFill(balance.stamps));
</script>

{#if user}
	<AppScreen nav={false}>
		<div class="page">
			<header>
				<a class="back" href="/home" aria-label="Back">←</a>
				<h1>My member card</h1>
			</header>
			<p class="sub">Scan at the cashier before you pay</p>

			<div class="qrcard"><Qr value={user.memberId} size={226} /></div>

			<div class="name"><b>{first}</b> {rest}</div>
			<div class="user">@{user.username}</div>
			<hr />
			<div class="grid">
				<div>
					<small>MEMBER ID</small>
					<button class="id" onclick={copyId} aria-label="Copy member ID">
						{user.memberId}
						<Icon name={copied ? 'check' : 'copy'} size={13} />
					</button>
				</div>
				<div><small>REGISTERED OUTLET</small><span class="v">{outletName(user.outletCode)}</span></div>
			</div>
			<div class="since"><small>MEMBER SINCE</small><span class="v">{longDate(user.createdAt)}</span></div>

			<a class="sb" href="/stamps">
				<div class="row"><b>Stamps & beans</b><span>{fill} / 10 · {balance.beans.toLocaleString('id-ID')} beans</span><Icon name="chevron" size={16} /></div>
				<div class="bar"><i style:width="{fill * 10}%"></i></div>
			</a>
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 28px calc(36px + env(safe-area-inset-bottom));
		text-align: center;
	}
	header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 40px;
	}
	.back {
		position: absolute;
		left: -4px;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: rgba(9, 7, 5, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		text-decoration: none;
	}
	h1 {
		margin: 0;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.04em;
	}
	.sub {
		margin: 14px 0 22px;
		font-size: 12px;
		color: var(--text-2);
	}
	.qrcard {
		display: inline-flex;
		padding: 22px;
		border-radius: 24px;
		background: var(--cream);
		box-shadow: 0 0 60px rgba(189, 120, 78, 0.22);
	}
	.name {
		margin-top: 26px;
		font-size: 22px;
		letter-spacing: -0.045em;
		font-weight: 400;
	}
	.name b {
		font-weight: 800;
	}
	.user {
		margin-top: 6px;
		font-size: 13px;
		font-weight: 700;
		color: var(--copper-soft);
	}
	hr {
		border: 0;
		border-top: 1px solid rgba(255, 255, 255, 0.14);
		margin: 18px 0;
	}
	.grid {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	small {
		display: block;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: var(--copper-soft);
	}
	.v,
	.id {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		font-size: 15px;
		font-weight: 700;
		color: #fff;
	}
	.id {
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}
	.since {
		margin-top: 16px;
	}
	.sb {
		display: block;
		margin-top: 26px;
		padding: 16px;
		text-align: left;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		text-decoration: none;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.row span {
		margin-left: auto;
		font-size: 12px;
		font-weight: 700;
		color: var(--copper-light);
	}
	.bar {
		margin-top: 12px;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.12);
		overflow: hidden;
	}
	.bar i {
		display: block;
		height: 100%;
		border-radius: 3px;
		background: linear-gradient(90deg, #83472c, #e0a073);
	}
</style>

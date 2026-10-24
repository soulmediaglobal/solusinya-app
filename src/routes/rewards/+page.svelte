<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BeansPill from '#lib/components/BeansPill.svelte';
	import Button from '#lib/components/Button.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { cardFill } from '#lib/format';
	import { loyalty } from '#lib/services';
	import type { Balance, Milestone, Reward, Voucher } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';
	import { expiryLabel, isUsable, sourceLabel, sourceNote } from '#lib/vouchers';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});

	let tab = $state<'mine' | 'get'>('mine');
	let balance = $state<Balance>({ stamps: 0, beans: 0, lifetimeBeans: 0 });
	let catalog = $state<Reward[]>([]);
	let milestones = $state<Milestone[]>([]);
	let vouchers = $state<Voucher[]>([]);
	let loaded = $state(false);
	let pick = $state<Reward | null>(null);
	let busy = $state(false);
	let error = $state('');
	let toast = $state('');

	async function load() {
		const [b, c, m, v] = await Promise.all([loyalty.balance(), loyalty.rewards(), loyalty.milestones(), loyalty.vouchers()]);
		balance = b;
		catalog = c;
		milestones = m;
		vouchers = v;
		loaded = true;
	}
	$effect(() => {
		if (session.user) load();
	});

	const mine = $derived(vouchers.filter((v) => isUsable(v)));
	const fill = $derived(cardFill(balance.stamps));

	async function confirm() {
		if (!pick || busy) return;
		busy = true;
		error = '';
		try {
			await loyalty.redeem(pick.id);
			toast = `${pick.name} added to My rewards`;
			setTimeout(() => (toast = ''), 3500);
			pick = null;
			tab = 'mine';
			await load();
		} catch (e) {
			error = e instanceof Error && /enough/.test(e.message) ? 'Not enough beans for this reward.' : 'Something went wrong. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

{#if session.user}
	<AppScreen>
		<div class="page">
			<header>
				<h1>Rewards</h1>
				<BeansPill beans={balance.beans} />
			</header>

			<div class="tabs" role="tablist">
				<button role="tab" aria-selected={tab === 'mine'} class:on={tab === 'mine'} onclick={() => (tab = 'mine')}>
					My rewards{mine.length ? ` · ${mine.length}` : ''}
				</button>
				<button role="tab" aria-selected={tab === 'get'} class:on={tab === 'get'} onclick={() => (tab = 'get')}>Get rewards</button>
			</div>

			{#if toast}<div class="toast" role="status"><Icon name="check" size={15} /> {toast}</div>{/if}

			{#if tab === 'mine'}
				{#each mine as v (v.id)}
					<article class="ticket">
						<div class="tl">
							<div class="kick">{sourceLabel(v)}</div>
							<div class="rt">{v.rewardName}</div>
							<div class="rn">{sourceNote(v)}</div>
							<div class="exp">{expiryLabel(v.expiresAt)}</div>
						</div>
						<div class="tr"><a class="use" href="/rewards/use?id={v.id}">Use</a></div>
					</article>
				{:else}
					{#if loaded}
						<div class="empty">
							<span class="ei"><Icon name="gift" size={26} /></span>
							<b>No rewards yet</b>
							<p>Collect stamps or redeem beans to get your first reward.</p>
							<button class="alt" onclick={() => (tab = 'get')}>See how to get rewards</button>
						</div>
					{/if}
				{/each}
				<a class="used" href="/stamps"><span>Used rewards are in Stamps & beans</span><b>View ›</b></a>
			{:else}
				{#each catalog as r (r.id)}
					{@const need = (r.beansCost ?? 0) - balance.beans}
					<div class="item" class:locked={need > 0}>
						<span class="gi"><Icon name="gift" size={20} /></span>
						<div class="it">
							<b>{r.name}</b>
							<small><Icon name="bean" size={11} /> {r.beansCost} beans</small>
						</div>
						{#if need > 0}
							<span class="more">{need.toLocaleString('id-ID')} more beans</span>
						{:else}
							<button class="redeem" onclick={() => { error = ''; pick = r; }}>Redeem</button>
						{/if}
					</div>
				{/each}

				{#if milestones.length}
					<div class="sec">STAMP MILESTONES</div>
					{#each milestones as m (m.position)}
						{@const done = fill >= m.position}
						<div class="ms">
							<span class="mi" class:done><Icon name={done ? 'check' : 'gift'} size={17} /></span>
							<div class="it">
								<b>Stamp {m.position} · {m.rewardName}</b>
								<small>{done ? 'Added to My rewards' : `${fill} / ${m.position} stamps`}</small>
							</div>
							<span class="state" class:done>{done ? 'Unlocked' : `${m.position - fill} to go`}</span>
						</div>
					{/each}
				{/if}
			{/if}
		</div>

		{#if pick}
			<div class="scrim" role="presentation" onclick={() => (pick = null)}></div>
			<div class="sheet" role="dialog" aria-label="Confirm redeem">
				<div class="grab"></div>
				<span class="sg"><Icon name="gift" size={24} /></span>
				<h2>Redeem {pick.name}?</h2>
				<p class="sd">The voucher goes to My rewards. Valid for 30 days.</p>
				<div class="calc">
					<div><span>Your beans</span><b>{balance.beans.toLocaleString('id-ID')}</b></div>
					<div><span>This reward</span><b>−{pick.beansCost}</b></div>
					<div class="after"><span>Beans after</span><b>{(balance.beans - (pick.beansCost ?? 0)).toLocaleString('id-ID')}</b></div>
				</div>
				{#if error}<div class="err" role="alert">{error}</div>{/if}
				<Button onclick={confirm} loading={busy}>Redeem for {pick.beansCost} beans</Button>
				<button class="cancel" onclick={() => (pick = null)}>Cancel</button>
			</div>
		{/if}
	</AppScreen>
{/if}

<style>
	.page {
		padding: 28px 24px 32px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h1 {
		margin: 0;
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.045em;
	}
	.tabs {
		display: flex;
		margin-top: 20px;
		padding: 4px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	.tabs button {
		flex: 1;
		height: 38px;
		border: 0;
		border-radius: 30px;
		background: transparent;
		color: var(--text-2);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.tabs button.on {
		background: var(--grad-primary);
		color: #fff;
	}
	.toast {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 14px;
		padding: 10px 14px;
		border-radius: 12px;
		background: rgba(127, 185, 138, 0.14);
		border: 1px solid rgba(127, 185, 138, 0.4);
		color: var(--success);
		font-size: 12px;
		font-weight: 700;
	}

	.ticket {
		position: relative;
		display: flex;
		margin-top: 16px;
		border-radius: 16px;
		border: 1px solid rgba(189, 120, 78, 0.7);
		background: rgba(189, 120, 78, 0.1);
	}
	.tl {
		flex: 1;
		padding: 16px 16px 16px 18px;
		min-width: 0;
	}
	.tr {
		position: relative;
		flex: none;
		width: 92px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-left: 1.5px dashed rgba(189, 120, 78, 0.55);
	}
	.tr::before,
	.tr::after {
		content: '';
		position: absolute;
		left: -8px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--bg);
		border: 1px solid rgba(189, 120, 78, 0.7);
	}
	.tr::before {
		top: -8px;
		border-top-color: transparent;
	}
	.tr::after {
		bottom: -8px;
		border-bottom-color: transparent;
	}
	.kick {
		font-size: 8.5px;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: var(--copper-light);
	}
	.rt {
		margin-top: 8px;
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.03em;
	}
	.rn {
		margin-top: 4px;
		font-size: 11px;
		color: var(--text-2);
	}
	.exp {
		margin-top: 10px;
		font-size: 10px;
		font-weight: 700;
		color: var(--copper-light);
	}
	.use {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 36px;
		padding: 0 20px;
		border-radius: 30px;
		background: var(--grad-primary);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
	}
	.used {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 24px;
		padding: 16px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		font-size: 12px;
		text-decoration: none;
	}
	.used b {
		color: var(--copper-light);
	}
	.empty {
		margin-top: 40px;
		text-align: center;
	}
	.empty b {
		display: block;
		margin-top: 14px;
		font-size: 16px;
	}
	.empty p {
		margin: 8px auto 18px;
		max-width: 240px;
		font-size: 12px;
		line-height: 18px;
		color: var(--text-2);
	}
	.ei {
		display: inline-flex;
		width: 56px;
		height: 56px;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(189, 120, 78, 0.18);
		color: var(--copper-light);
	}
	.alt {
		height: 40px;
		padding: 0 20px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: transparent;
		color: #fff;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.item,
	.ms {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.item {
		margin-top: 12px;
		padding: 12px 14px 12px 12px;
		border-radius: 16px;
		border: 1px solid rgba(189, 120, 78, 0.5);
		background: rgba(189, 120, 78, 0.08);
	}
	.item.locked {
		border-color: rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.03);
	}
	.gi,
	.mi {
		flex: none;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: rgba(189, 120, 78, 0.22);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.it {
		flex: 1;
		min-width: 0;
	}
	.it b {
		display: block;
		font-size: 13px;
	}
	.it small {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 4px;
		font-size: 11px;
		font-weight: 700;
		color: var(--copper-light);
	}
	.redeem {
		height: 36px;
		padding: 0 18px;
		border-radius: 30px;
		border: 1px solid var(--copper);
		background: transparent;
		color: var(--copper-light);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.more {
		padding: 9px 12px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		font-size: 10px;
		font-weight: 700;
		color: var(--text-3);
		white-space: nowrap;
	}
	.sec {
		margin: 28px 2px 6px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
	}
	.ms {
		padding: 12px 2px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.mi {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.6);
	}
	.mi.done {
		background: rgba(189, 120, 78, 0.25);
		color: var(--copper-light);
	}
	.ms .it small {
		color: var(--text-3);
		font-weight: 500;
	}
	.state {
		font-size: 11px;
		font-weight: 700;
		color: var(--text-2);
	}
	.state.done {
		color: var(--copper-light);
	}

	.scrim {
		position: fixed;
		inset: 0;
		z-index: 20;
		background: rgba(0, 0, 0, 0.6);
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 21;
		padding: 12px 24px calc(28px + env(safe-area-inset-bottom));
		border-radius: 28px 28px 0 0;
		border-top: 1px solid rgba(189, 120, 78, 0.5);
		background: #140d09;
		text-align: center;
		display: flex;
		flex-direction: column;
	}
	.grab {
		align-self: center;
		width: 40px;
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.25);
	}
	.sg {
		align-self: center;
		margin-top: 20px;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		background: rgba(189, 120, 78, 0.28);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	h2 {
		margin: 12px 0 0;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.03em;
	}
	.sd {
		margin: 6px 0 18px;
		font-size: 12px;
		color: var(--text-2);
	}
	.calc {
		padding: 14px 16px;
		margin-bottom: 18px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		text-align: left;
		font-size: 13px;
	}
	.calc div {
		display: flex;
		justify-content: space-between;
		padding: 5px 0;
		color: var(--text-2);
	}
	.calc b {
		color: #fff;
	}
	.calc .after {
		margin-top: 6px;
		padding-top: 10px;
		border-top: 1px solid rgba(255, 255, 255, 0.14);
	}
	.err {
		margin: -6px 0 12px;
		font-size: 12px;
		font-weight: 600;
		color: var(--error);
	}
	.cancel {
		margin-top: 10px;
		height: 40px;
		border: 0;
		background: transparent;
		color: var(--copper-light);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}
</style>

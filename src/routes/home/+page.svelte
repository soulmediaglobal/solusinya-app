<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import PhotoHeader from '#lib/components/PhotoHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Qr from '#lib/components/Qr.svelte';
	import { cardFill, greeting, outletName, rp, whenLabel } from '#lib/format';
	import { loyalty } from '#lib/services';
	import type { Activity, Balance, Promotion } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});

	let balance = $state<Balance>({ stamps: 0, beans: 0, lifetimeBeans: 0 });
	let activity = $state<Activity[]>([]);
	let promos = $state<Promotion[]>([]);
	let slide = $state(0);
	let loaded = $state(false);
	$effect(() => {
		if (!session.user) return;
		Promise.all([loyalty.balance(), loyalty.activity(5), loyalty.promotions()]).then(([b, a, p]) => {
			balance = b;
			activity = a;
			promos = p;
			loaded = true;
		});
	});

	const user = $derived(session.user);
	const first = $derived(user?.fullName.split(' ')[0] ?? '');
	const rest = $derived(user?.fullName.split(' ').slice(1).join(' ') ?? '');
	const fill = $derived(cardFill(balance.stamps));
	const next = $derived(fill + 1);
	function onScroll(e: Event) {
		const el = e.currentTarget as HTMLElement;
		slide = Math.round(el.scrollLeft / 312);
	}
</script>

{#if user}
	<AppScreen>
		<PhotoHeader height={300} logo={false} />
		<img class="mascot" src="/img/solu-wave.png" alt="" />

		<div class="wrap">
			<header>
				<div class="hi">{greeting()}</div>
				<div class="name">{first}</div>
			</header>

			<a class="beans" href="/stamps">
				<span class="bi"><Icon name="bean" size={17} /></span>
				<span><b>{balance.beans.toLocaleString('id-ID')}</b> <small>beans</small></span>
				<span class="chev"><Icon name="chevron" size={16} /></span>
			</a>

			<a class="card" href="/card" aria-label="Open my member card">
				<img src="/img/bar.jpg" alt="" />
				<div class="shade"></div>
				<div class="brand"><span class="ic logo"></span><span>SOLU CLUB</span></div>
				<div class="tag">MEMBER CARD</div>
				<div class="who">
					<div class="full"><b>{first}</b>&nbsp;{rest}</div>
					<div class="user">@{user.username}</div>
				</div>
				<div class="ids">
					<div><small>MEMBER ID</small><span>{user.memberId}</span></div>
					<div><small>REGISTERED OUTLET</small><span>{outletName(user.outletCode)}</span></div>
				</div>
				<div class="qrbox"><Qr value={user.memberId} size={70} /></div>
			</a>

			<div class="head">
				<h2>Your stamps <span>{fill} / 10</span></h2>
				<a href="/stamps">See all</a>
			</div>
			<div class="stamps" aria-label="{fill} of 10 stamps collected">
				{#each Array.from({ length: 10 }, (_, i) => i + 1) as n (n)}
					<div class="s" class:full={n <= fill} class:next={n === next} class:future={n > next}>
						{#if n > fill}{n}{/if}
						{#if n === 5 || n === 10}<i class="gift"><Icon name="gift" size={9} /></i>{/if}
					</div>
				{/each}
			</div>

			{#if promos.length}
				<div class="head promo">
					<h2>Promotions</h2>
					{#if promos.length > 1}<span class="swipe">Swipe</span>{/if}
				</div>
				<div class="slider" onscroll={onScroll}>
					{#each promos as p (p.id)}
						<article class="banner">
							<img src="/img/bar.jpg" alt="" style:object-position="{p.focusX}% {p.focusY}%" />
							<div class="bshade"></div>
							<div class="btxt">
								<div class="kick">{p.kicker}</div>
								<div class="bt">{p.title}</div>
								<div class="bs">{p.subtitle}</div>
							</div>
						</article>
					{/each}
					<div class="endpad"></div>
				</div>
				{#if promos.length > 1}
					<div class="dots" aria-hidden="true">
						{#each promos as p, i (p.id)}<span class:on={i === slide}></span>{/each}
					</div>
				{/if}
			{/if}

			<div class="head act">
				<h2>Latest activity</h2>
				{#if activity.length}<a href="/stamps">View all</a>{/if}
			</div>
			{#if activity.length}
				<ul>
					{#each activity as a (a.id)}
						<li>
							<span class="ico"><Icon name="bag" size={18} /></span>
							<div class="txt">
								<b>Purchase</b>
								<small>{outletName(a.outletCode)} · {whenLabel(a.createdAt)} · +{a.beans} beans · +{a.stamps} stamp</small>
							</div>
							<strong>{rp(a.amountRp)}</strong>
						</li>
					{/each}
				</ul>
				<a class="all" href="/stamps">View all history</a>
			{:else if loaded}
				<p class="empty">No activity yet. Your first purchase will show up here.</p>
			{/if}

			{#if user.isAdmin}
				<div class="adm"><a href="/admin">Admin: add transaction</a></div>
			{/if}

			<a class="showqr" href="/card"><Icon name="qr" size={18} /> Show my QR</a>
		</div>
	</AppScreen>
{/if}

<style>
	.mascot {
		position: absolute;
		top: -27px;
		left: 240px;
		width: 131px;
		height: 249px;
		object-fit: contain;
		filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.5));
		pointer-events: none;
	}
	.wrap {
		position: relative;
		padding: 34px 24px 0;
	}
	header {
		padding: 0 4px;
		max-width: 200px;
	}
	.hi {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.75);
	}
	.name {
		margin-top: 2px;
		font-size: 25px;
		font-weight: 800;
		letter-spacing: -0.045em;
		line-height: 1.1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.beans {
		margin: 66px 0 14px 4px;
		width: 200px;
		height: 48px;
		padding: 0 14px 0 8px;
		border-radius: 999px;
		border: 1px solid rgba(189, 120, 78, 0.7);
		background: rgba(9, 7, 5, 0.7);
		display: flex;
		align-items: center;
		gap: 10px;
		color: #fff;
		text-decoration: none;
	}
	.bi {
		flex: none;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(189, 120, 78, 0.3);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.beans b {
		font-size: 17px;
		font-weight: 800;
	}
	.beans small {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-2);
	}
	.chev {
		margin-left: auto;
		color: var(--copper-light);
		display: flex;
	}

	.card {
		position: relative;
		display: block;
		height: 215px;
		overflow: hidden;
		border-radius: 16px;
		border: 1px solid rgba(189, 120, 78, 0.55);
		background: var(--bg);
		color: #fff;
		text-decoration: none;
		box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55), 0 0 40px rgba(189, 120, 78, 0.18);
	}
	.card > img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, rgba(9, 7, 5, 0.9) 0%, rgba(9, 7, 5, 0.74) 34%, rgba(9, 7, 5, 0.28) 66%, rgba(9, 7, 5, 0.08) 100%),
			linear-gradient(0deg, rgba(9, 7, 5, 0.65) 0%, rgba(9, 7, 5, 0) 38%);
	}
	.brand {
		position: absolute;
		left: 18px;
		top: 15px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: var(--copper-soft);
	}
	.brand .logo {
		width: 16px;
		height: 20px;
		background: var(--copper);
	}
	.tag {
		position: absolute;
		right: 18px;
		top: 18px;
		font-size: 6.5px;
		font-weight: 600;
		letter-spacing: 0.3em;
		color: rgba(255, 255, 255, 0.85);
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
	}
	.who {
		position: absolute;
		left: 18px;
		top: 50%;
		transform: translateY(-50%);
		max-width: 190px;
	}
	.full {
		font-size: 21px;
		letter-spacing: -0.045em;
		line-height: 1;
		white-space: nowrap;
		font-weight: 400;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.full b {
		font-weight: 800;
	}
	.user {
		margin-top: 5px;
		font-size: 10px;
		font-weight: 600;
		color: var(--copper-soft);
	}
	.ids {
		position: absolute;
		left: 18px;
		bottom: 16px;
		padding-top: 9px;
		padding-right: 8px;
		border-top: 1px solid rgba(189, 120, 78, 0.6);
		display: flex;
		gap: 18px;
		white-space: nowrap;
	}
	.ids small {
		display: block;
		font-size: 6.5px;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--copper-soft);
	}
	.ids span {
		display: block;
		margin-top: 3px;
		font-size: 10px;
		font-weight: 700;
	}
	.qrbox {
		position: absolute;
		right: 16px;
		bottom: 16px;
		width: 82px;
		height: 82px;
		padding: 6px;
		background: var(--cream);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 0 1px rgba(189, 120, 78, 0.8), 0 0 0 3px rgba(9, 7, 5, 0.55);
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin: 22px 4px 12px;
	}
	.head h2 {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.head h2 span {
		color: var(--copper-soft);
	}
	.head a {
		font-size: 12px;
		font-weight: 700;
		color: var(--copper-light);
		text-decoration: none;
	}
	.stamps {
		display: grid;
		grid-template-columns: repeat(5, 44px);
		justify-content: space-between;
		row-gap: 10px;
		padding: 0 4px;
	}
	.s {
		position: relative;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 700;
	}
	.s.full {
		background: radial-gradient(circle at 35% 30%, #e0a073, #bd784e 58%, #83472c);
		border: 1px solid rgba(232, 178, 142, 0.6);
	}
	.s.next {
		border: 1.5px solid var(--copper);
		color: var(--copper-light);
		box-shadow: 0 0 0 0 rgba(232, 178, 142, 0.45);
		animation: pulse 2s infinite;
	}
	.s.future {
		border: 1px dashed rgba(255, 255, 255, 0.28);
		color: rgba(255, 255, 255, 0.45);
	}
	.gift {
		position: absolute;
		right: -3px;
		top: -3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--bg);
		border: 1px solid var(--copper);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.promo {
		margin-top: 28px;
	}
	.swipe {
		font-size: 11px;
		color: var(--text-3);
	}
	.slider {
		display: flex;
		gap: 12px;
		margin: 0 -24px;
		padding: 0 24px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-padding-left: 24px;
		scrollbar-width: none;
	}
	.slider::-webkit-scrollbar {
		display: none;
	}
	.banner {
		position: relative;
		flex: none;
		width: 300px;
		height: 140px;
		overflow: hidden;
		border-radius: 16px;
		border: 1px solid rgba(189, 120, 78, 0.5);
		scroll-snap-align: start;
	}
	.banner img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.bshade {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, rgba(9, 7, 5, 0.92) 0%, rgba(9, 7, 5, 0.65) 55%, rgba(9, 7, 5, 0.25) 100%);
	}
	.btxt {
		position: absolute;
		left: 18px;
		right: 18px;
		bottom: 18px;
	}
	.kick {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-light);
	}
	.bt {
		margin-top: 6px;
		font-size: 19px;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.15;
	}
	.bs {
		margin-top: 4px;
		font-size: 11px;
		color: var(--text-2);
	}
	.endpad {
		flex: none;
		width: 12px;
	}
	.dots {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin-top: 14px;
	}
	.dots span {
		width: 6px;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.3);
		transition: width 0.2s;
	}
	.dots span.on {
		width: 18px;
		background: var(--copper);
	}
	.act {
		margin-top: 30px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0 4px;
	}
	li {
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 60px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.ico {
		flex: none;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.txt {
		flex: 1;
		min-width: 0;
	}
	.txt b {
		display: block;
		font-size: 13px;
	}
	.txt small {
		display: block;
		margin-top: 3px;
		font-size: 10px;
		color: var(--text-3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	li strong {
		font-size: 12px;
		white-space: nowrap;
	}
	.empty {
		margin: 4px;
		font-size: 12px;
		line-height: 18px;
		color: var(--text-3);
	}
	.all {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 46px;
		margin: 16px 4px 0;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	.adm {
		margin: 18px 4px 0;
		text-align: center;
		font-size: 12px;
		font-weight: 700;
		color: var(--copper-light);
	}
	.showqr {
		position: sticky;
		bottom: calc(82px + env(safe-area-inset-bottom));
		z-index: 4;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		height: 50px;
		margin: 28px 4px 12px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		background: var(--grad-primary);
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
	}
</style>

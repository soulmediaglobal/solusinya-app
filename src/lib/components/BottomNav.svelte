<script lang="ts">
	import { page } from '$app/state';
	import Icon, { type IconName } from './Icon.svelte';

	const tabs: { href: string; label: string; icon: IconName }[] = [
		{ href: '/home', label: 'Home', icon: 'home' },
		{ href: '/rewards', label: 'Rewards', icon: 'gift' },
		{ href: '/stamps', label: 'Beans', icon: 'bean' },
		{ href: '/community', label: 'Community', icon: 'users' },
		{ href: '/profile', label: 'Profile', icon: 'user' }
	];
	const active = (href: string) => page.url.pathname === href || page.url.pathname.startsWith(href + '/');
</script>

<nav aria-label="Main">
	{#each tabs as t (t.href)}
		<a href={t.href} class:on={active(t.href)} aria-current={active(t.href) ? 'page' : undefined}>
			<Icon name={t.icon} size={22} />
			<span>{t.label}</span>
		</a>
	{/each}
</nav>

<style>
	nav {
		position: sticky;
		bottom: 0;
		z-index: 5;
		display: flex;
		justify-content: space-between;
		height: calc(70px + env(safe-area-inset-bottom));
		padding: 0 10px calc(8px + env(safe-area-inset-bottom));
		align-items: center;
		background: var(--bg-deep);
		border-top: 1px solid rgba(255, 255, 255, 0.12);
	}
	a {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		color: rgba(255, 255, 255, 0.72);
		text-decoration: none;
		white-space: nowrap;
	}
	a.on {
		color: var(--copper);
	}
	span {
		font-size: 8.5px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
</style>

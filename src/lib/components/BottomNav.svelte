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
		bottom: calc(12px + env(safe-area-inset-bottom));
		z-index: 5;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2px;
		height: 62px;
		margin: 0 14px calc(12px + env(safe-area-inset-bottom));
		padding: 0 6px;
		border-radius: 999px;
		background: rgba(5, 4, 3, 0.94);
		border: 1px solid rgba(255, 255, 255, 0.16);
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(10px);
	}
	a {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		height: 50px;
		border-radius: 999px;
		color: rgba(255, 255, 255, 0.72);
		text-decoration: none;
		white-space: nowrap;
	}
	a.on {
		color: var(--copper);
		background: rgba(255, 255, 255, 0.08);
	}
	span {
		font-size: 8.5px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
</style>

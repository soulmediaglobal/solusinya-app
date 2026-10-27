<script lang="ts">
	let { active }: { active: 'overview' | 'segments' | 'insights' | 'members' | 'campaigns' | 'audit' } = $props();
	const tabs = [
		{ id: 'overview', href: '/admin/crm', label: 'Overview' },
		{ id: 'segments', href: '/admin/crm/segments', label: 'Segments' },
		{ id: 'insights', href: '/admin/crm/insights', label: 'Insights' },
		{ id: 'members', href: '/admin/crm/members', label: 'Members' },
		{ id: 'campaigns', href: '/admin/crm/campaigns', label: 'Campaigns' },
		{ id: 'audit', href: '/admin/crm/audit', label: 'Audit' }
	] as const;
</script>

<nav aria-label="CRM sections">
	{#each tabs as t (t.id)}
		<a href={t.href} class:on={active === t.id} aria-current={active === t.id ? 'page' : undefined}>{t.label}</a>
	{/each}
</nav>

<style>
	nav {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 4px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.04);
	}
	a {
		padding: 7px 16px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		color: var(--text-2);
		text-decoration: none;
	}
	a.on {
		background: var(--grad-primary);
		color: #fff;
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import Screen from '#lib/components/Screen.svelte';
	import Field from '#lib/components/Field.svelte';
	import Button from '#lib/components/Button.svelte';
	import { loyalty } from '#lib/services';
	import type { MenuItem } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	let items = $state<MenuItem[]>([]);
	let name = $state('');
	let category = $state('Drinks');
	let busy = $state(false);
	let error = $state('');

	async function load() {
		items = await loyalty.menuItems();
	}
	$effect(() => {
		if (session.user?.isAdmin) load().catch(() => (error = 'Could not load the menu.'));
	});

	const nextSort = $derived(items.reduce((a, x) => Math.max(a, x.sort), 0) + 1);
	const groups = $derived(
		[...new Set(items.map((x) => x.category))].map((c) => ({ category: c, items: items.filter((x) => x.category === c) }))
	);

	async function add(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!name.trim()) return (error = 'Type the menu name.');
		busy = true;
		try {
			await loyalty.saveMenuItem({ name: name.trim(), category: category.trim() || 'Drinks', sort: nextSort, active: true });
			name = '';
			await load();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save.';
		} finally {
			busy = false;
		}
	}
	async function toggle(m: MenuItem) {
		error = '';
		try {
			await loyalty.saveMenuItem({ id: m.id, name: m.name, category: m.category, sort: m.sort, active: !m.active });
			await load();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save.';
		}
	}
</script>

{#if session.user?.isAdmin}
	<Screen back="/admin" heroHeight={210} top={92}>
		<form onsubmit={add} class="form" novalidate>
			<h1 class="title">Menu</h1>
			<p class="hint">The cashier can tick what a member had when recording a transaction. It stays optional, and it feeds "favorite menu" in the CRM.</p>
			<Field label="Menu name" bind:value={name} placeholder="Es Kopi Susu" />
			<Field label="Category" bind:value={category} placeholder="Drinks" />
			{#if error}<div class="msg" role="alert">{error}</div>{/if}
			<div class="gap"></div>
			<Button type="submit" loading={busy} disabled={!name.trim()}>Add to the menu</Button>
		</form>

		{#each groups as g (g.category)}
			<section class="grp">
				<h2>{g.category}</h2>
				{#each g.items as m (m.id)}
					<div class="row" class:off={!m.active}>
						<span>{m.name}</span>
						<button type="button" onclick={() => toggle(m)}>{m.active ? 'Hide' : 'Show'}</button>
					</div>
				{/each}
			</section>
		{/each}
		{#if items.length === 0}<p class="empty">No menu yet. Add your first item above.</p>{/if}
		<div class="end"></div>
	</Screen>
{/if}

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.form :global(.title) {
		margin-bottom: 4px;
	}
	.hint {
		margin: 0 4px 6px;
		font-size: 12px;
		line-height: 18px;
		color: rgba(255, 255, 255, 0.65);
	}
	.msg {
		margin: 2px 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--error);
	}
	.gap {
		height: 8px;
	}
	.grp {
		margin-top: 26px;
	}
	.grp h2 {
		margin: 0 0 6px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--copper-soft);
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 46px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 14px;
		font-weight: 600;
	}
	.row.off span {
		color: rgba(255, 255, 255, 0.4);
		text-decoration: line-through;
	}
	.row button {
		background: none;
		border: 0;
		color: var(--copper-light);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.empty {
		margin-top: 24px;
		text-align: center;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);
	}
	.end {
		height: calc(36px + env(safe-area-inset-bottom));
	}
</style>

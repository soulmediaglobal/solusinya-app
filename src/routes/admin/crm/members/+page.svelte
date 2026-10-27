<script lang="ts">
	import { goto } from '$app/navigation';
	import { loyalty } from '#lib/services';
	import type { CrmMemberRow } from '#lib/services/loyalty';
	import { OUTLETS } from '#lib/config';
	import { session } from '#lib/stores/session.svelte';
	import CrmTabs from '#lib/components/crm/CrmTabs.svelte';
	import { rp } from '#lib/components/crm/palette';
	import '#lib/components/crm/crm.css';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	let q = $state('');
	let rows = $state<CrmMemberRow[]>([]);
	let loading = $state(false);
	let error = $state('');
	let sort = $state<'total' | 'visits' | 'lastVisit' | 'createdAt'>('total');

	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		const query = q;
		if (!session.user?.isAdmin) return;
		clearTimeout(timer);
		timer = setTimeout(async () => {
			loading = true;
			error = '';
			try {
				const res = await loyalty.crmMembers(query, 200);
				if (query === q) rows = res;
			} catch (e) {
				error = e instanceof Error ? e.message : 'Could not load members.';
			} finally {
				loading = false;
			}
		}, 250);
		return () => clearTimeout(timer);
	});

	const outletName = (c: string) => OUTLETS.find((o) => o.code === c)?.name ?? c;
	const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');
	const sorted = $derived(
		[...rows].sort((a, b) => {
			if (sort === 'total') return b.total - a.total;
			if (sort === 'visits') return b.visits - a.visits;
			if (sort === 'createdAt') return b.createdAt.localeCompare(a.createdAt);
			return (b.lastVisit ?? '').localeCompare(a.lastVisit ?? '');
		})
	);
	const open = (u: string) => goto(`/admin/crm/member?u=${encodeURIComponent(u)}`);
</script>

{#if session.user?.isAdmin}
	<div class="crm-page">
		<header class="crm-top">
			<div>
				<a class="back" href="/admin">‹ Back to admin</a>
				<h1>Members</h1>
				<CrmTabs active="members" />
			</div>
			<label class="search">
				<span class="sr">Search members</span>
				<input type="search" bind:value={q} placeholder="Search name, @username, email or member ID" autocapitalize="none" autocorrect="off" />
			</label>
		</header>

		{#if error}<div class="crm-alert" role="alert">{error}</div>{/if}

		<section class="crm-card">
			<div class="bar">
				<h2>{rows.length} {rows.length === 1 ? 'member' : 'members'}{#if loading} <small>searching…</small>{/if}</h2>
				<div class="sorts" role="group" aria-label="Sort by">
					{#each [['total', 'Top spenders'], ['visits', 'Most visits'], ['lastVisit', 'Latest visit'], ['createdAt', 'Newest']] as [id, label] (id)}
						<button type="button" class:on={sort === id} onclick={() => (sort = id as typeof sort)}>{label}</button>
					{/each}
				</div>
			</div>
			{#if sorted.length === 0 && !loading}
				<p class="crm-empty">No members found.</p>
			{:else}
				<div class="crm-scroll">
					<table class="crm-table">
						<thead>
							<tr><th>Member</th><th>Home outlet</th><th>Level</th><th class="r">Visits</th><th class="r">Outlets</th><th class="r">Total spend</th><th class="r">Last visit</th><th class="r">Joined</th></tr>
						</thead>
						<tbody>
							{#each sorted as m (m.username)}
								<tr class="link" onclick={() => open(m.username)} onkeydown={(e) => e.key === 'Enter' && open(m.username)} tabindex="0">
									<td><b>{m.fullName}</b><span>@{m.username} · {m.memberId}</span></td>
									<td>{outletName(m.homeOutlet)}</td>
									<td><span class="crm-chip">{m.level}</span></td>
									<td class="r">{m.visits}</td>
									<td class="r">{m.outlets}</td>
									<td class="r">{rp(m.total)}</td>
									<td class="r">{date(m.lastVisit)}</td>
									<td class="r">{date(m.createdAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	</div>
{/if}

<style>
	.search input {
		width: min(420px, 90vw);
		height: 40px;
		padding: 0 16px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
		font-size: 13px;
		outline: none;
	}
	.search input:focus {
		border-color: var(--copper);
	}
	.sr {
		position: absolute;
		left: -9999px;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}
	.bar h2 {
		margin: 0;
	}
	.sorts {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.sorts button {
		height: 30px;
		padding: 0 12px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--text-2);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}
	.sorts button.on {
		background: var(--grad-primary);
		border-color: transparent;
		color: #fff;
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { loyalty } from '#lib/services';
	import type { CrmAuditRow } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';
	import { downloadCsv } from '#lib/csv';
	import CrmTabs from '#lib/components/crm/CrmTabs.svelte';
	import '#lib/components/crm/crm.css';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	let rows = $state<CrmAuditRow[]>([]);
	let error = $state('');
	let loading = $state(false);

	$effect(() => {
		if (!session.user?.isAdmin) return;
		loading = true;
		loyalty
			.crmAudit(200)
			.then((r) => (rows = r))
			.catch((e) => (error = e instanceof Error ? e.message : 'Could not load the log.'))
			.finally(() => (loading = false));
	});

	const LABEL: Record<string, string> = {
		'beans.grant': 'Beans adjusted',
		'voucher.grant': 'Voucher gifted',
		'note.add': 'Note added',
		'followup.add': 'Follow-up added',
		'note.delete': 'Note deleted',
		'tags.set': 'Tags changed',
		'campaign.create': 'Campaign created',
		'menu.save': 'Menu changed',
		'reward.cost': 'Reward cost changed'
	};
	const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
	const detail = (d: Record<string, unknown>) =>
		Object.entries(d)
			.filter(([, v]) => v !== null && v !== undefined && v !== '')
			.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
			.join(' · ');

	function exportCsv() {
		downloadCsv('solu-club-audit-log.csv', ['when', 'admin', 'action', 'member', 'details'], rows.map((r) => [r.createdAt, r.admin, r.action, r.target, detail(r.details)]));
	}
</script>

{#if session.user?.isAdmin}
	<div class="crm-page">
		<header class="crm-top">
			<div>
				<a class="back" href="/admin">‹ Back to admin</a>
				<h1>Audit log</h1>
				<CrmTabs active="audit" />
				<p class="sub">Every change an admin makes in the CRM: who did it, to whom, and why. It cannot be edited from the app.</p>
			</div>
			<button type="button" class="ghost" onclick={exportCsv} disabled={!rows.length}>Export CSV</button>
		</header>
		{#if error}<div class="crm-alert" role="alert">{error}</div>{/if}
		<article class="crm-card" style:opacity={loading ? 0.55 : 1}>
			{#if rows.length === 0 && !loading}
				<p class="crm-empty">Nothing has been changed yet.</p>
			{:else}
				<div class="crm-scroll">
					<table class="crm-table">
						<thead><tr><th>When</th><th>Admin</th><th>What</th><th>Member</th><th>Details</th></tr></thead>
						<tbody>
							{#each rows as r (r.id)}
								<tr>
									<td>{when(r.createdAt)}</td>
									<td>{r.admin ? '@' + r.admin : '–'}</td>
									<td><span class="crm-chip">{LABEL[r.action] ?? r.action}</span></td>
									<td>{r.target ? '@' + r.target : '–'}</td>
									<td class="det">{detail(r.details)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</article>
	</div>
{/if}

<style>
	.ghost {
		height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--text-2);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.det {
		max-width: 420px;
		white-space: normal !important;
		color: var(--text-2);
	}
</style>

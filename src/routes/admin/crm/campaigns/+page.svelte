<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { loyalty } from '#lib/services';
	import type { CrmCampaignDetail, CrmCampaignSummary } from '#lib/services/loyalty';
	import { session } from '#lib/stores/session.svelte';
	import { downloadCsv } from '#lib/csv';
	import CrmTabs from '#lib/components/crm/CrmTabs.svelte';
	import { rp } from '#lib/components/crm/palette';
	import '#lib/components/crm/crm.css';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
		else if (!session.user.isAdmin) goto('/home', { replaceState: true });
	});

	const id = $derived(page.url.searchParams.get('id') ?? '');
	let list = $state<CrmCampaignSummary[]>([]);
	let detail = $state<CrmCampaignDetail | null>(null);
	let error = $state('');
	let loading = $state(false);

	async function load() {
		loading = true;
		error = '';
		try {
			if (id) detail = await loyalty.crmCampaign(id);
			else list = await loyalty.crmCampaigns();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load.';
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		void id;
		if (session.user?.isAdmin) {
			detail = null;
			load();
		}
	});

	const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
	const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;
	const link = (phone: string, name: string, message: string) =>
		`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message.replaceAll('{name}', firstName(name)))}`;

	// Mark as sent when the admin opens the link, so the 14-day follow-up window starts at the right moment.
	async function opened(username: string) {
		if (!detail) return;
		try {
			await loyalty.crmMarkSent(detail.id, username);
			const r = detail.recipients.find((x) => x.username === username);
			if (r && !r.sentAt) r.sentAt = new Date().toISOString();
		} catch {
			/* the link still opens; the status refreshes on the next load */
		}
	}

	const sent = $derived(detail?.recipients.filter((r) => r.sentAt).length ?? 0);
	const back = $derived(detail?.recipients.filter((r) => r.returned).length ?? 0);
	const revenue = $derived(detail?.recipients.reduce((a, r) => a + r.revenueAfter, 0) ?? 0);

	function exportCsv() {
		if (!detail) return;
		downloadCsv(`campaign-${detail.name.replace(/\W+/g, '-').toLowerCase()}.csv`, ['username', 'name', 'sent_at', 'came_back_within_14_days', 'spent_after_rp'], detail.recipients.map((r) => [r.username, r.fullName, r.sentAt, r.returned ? 'yes' : 'no', r.revenueAfter]));
	}
</script>

{#if session.user?.isAdmin}
	<div class="crm-page">
		<header class="crm-top">
			<div>
				<a class="back" href={id ? '/admin/crm/campaigns' : '/admin'}>{id ? '‹ All campaigns' : '‹ Back to admin'}</a>
				<h1>{detail ? detail.name : 'Campaigns'}</h1>
				<CrmTabs active="campaigns" />
				<p class="sub">
					{#if id && detail}Created {when(detail.createdAt)}{detail.segment ? ' · segment: ' + detail.segment.replace('_', ' ') : ''}
					{:else}WhatsApp messages you sent by hand, and who came back afterwards. Start one from the Segments tab.{/if}
				</p>
			</div>
			{#if detail}<button type="button" class="ghost" onclick={exportCsv}>Export CSV</button>{/if}
		</header>

		{#if error}<div class="crm-alert" role="alert">{error}</div>{/if}

		{#if id && detail}
			<div class="crm-stack" class:dim={loading}>
				<section class="crm-kpis three">
					<div class="crm-kpi"><span class="k">Recipients</span><b>{detail.recipients.length}</b><span class="note">only members who agreed to promos</span></div>
					<div class="crm-kpi"><span class="k">Sent</span><b>{sent}</b><span class="note">{detail.recipients.length - sent} still to send</span></div>
					<div class="crm-kpi"><span class="k">Came back in 14 days</span><b>{back}</b><span class="note">{sent ? Math.round((back / sent) * 100) : 0}% of those sent · {rp(revenue)} spent</span></div>
				</section>

				<article class="crm-card">
					<h2>Message</h2>
					<p class="msg">{detail.message}</p>
					<p class="cap">Each tap on "Open WhatsApp" opens a chat with the message filled in and marks the member as sent. You still press send in WhatsApp yourself. Sending to many people quickly can get a number flagged, so go at a human pace.</p>
				</article>

				<article class="crm-card">
					<h2>Recipients</h2>
					<div class="crm-scroll">
						<table class="crm-table">
							<thead><tr><th>Member</th><th>Status</th><th>Came back</th><th class="r">Spent after</th><th class="r"></th></tr></thead>
							<tbody>
								{#each detail.recipients as r (r.username)}
									<tr>
										<td><b>{r.fullName}</b><span>@{r.username}</span></td>
										<td>{#if r.sentAt}<span class="crm-chip ok">sent {when(r.sentAt)}</span>{:else}<span class="crm-chip mute">not sent</span>{/if}</td>
										<td>{#if !r.sentAt}–{:else if r.returned}<span class="crm-chip ok">yes</span>{:else}<span class="crm-chip mute">not yet</span>{/if}</td>
										<td class="r">{r.revenueAfter ? rp(r.revenueAfter) : '–'}</td>
										<td class="r"><a class="crm-btn" href={link(r.whatsapp, r.fullName, detail.message)} target="_blank" rel="noopener" onclick={() => opened(r.username)}>{r.sentAt ? 'Open again' : 'Open WhatsApp'}</a></td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</article>
			</div>
		{:else if !id}
			<article class="crm-card" class:dim={loading}>
				{#if list.length === 0}
					<p class="crm-empty">No campaigns yet. Go to Segments, tick the members you want to message, and create one.</p>
				{:else}
					<div class="crm-scroll">
						<table class="crm-table">
							<thead><tr><th>Campaign</th><th>Created</th><th class="r">Recipients</th><th class="r">Sent</th><th class="r">Came back</th><th class="r">Spent after</th></tr></thead>
							<tbody>
								{#each list as c (c.id)}
									<tr class="link" onclick={() => goto('/admin/crm/campaigns?id=' + encodeURIComponent(c.id))}>
										<td><b>{c.name}</b><span>{c.segment ? c.segment.replace('_', ' ') : 'hand-picked'}{c.createdBy ? ' · @' + c.createdBy : ''}</span></td>
										<td>{when(c.createdAt)}</td>
										<td class="r">{c.recipients}</td>
										<td class="r">{c.sent}</td>
										<td class="r">{c.sent ? Math.round((c.returned / c.sent) * 100) + '%' : '–'}</td>
										<td class="r">{c.revenueAfter ? rp(c.revenueAfter) : '–'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</article>
		{/if}
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
	.crm-kpis.three {
		grid-template-columns: repeat(3, 1fr);
	}
	.msg {
		margin: 0;
		padding: 12px 14px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.06);
		font-size: 13px;
		line-height: 20px;
		white-space: pre-wrap;
	}
	.dim {
		opacity: 0.55;
	}
</style>

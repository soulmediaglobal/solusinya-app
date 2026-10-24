<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Button from '#lib/components/Button.svelte';
	import { auth } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';
	import { SOCIALS, type Social, type SocialPlatform } from '#lib/types';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	let values = $state<Record<string, string>>({});
	let saved = $state<Record<string, string>>({});
	let loaded = $state(false);
	let busy = $state(false);
	let error = $state('');
	$effect(() => {
		if (!session.user) return;
		auth.socials().then((list) => {
			const m: Record<string, string> = {};
			for (const s of list) m[s.platform] = s.handle;
			values = { ...m };
			saved = { ...m };
			loaded = true;
		});
	});

	const changed = $derived(SOCIALS.some((s) => (values[s.key] ?? '').trim() !== (saved[s.key] ?? '')));
	async function save() {
		if (busy) return;
		busy = true;
		error = '';
		try {
			const list: Social[] = SOCIALS.filter((s) => (values[s.key] ?? '').trim()).map((s) => ({
				platform: s.key as SocialPlatform,
				handle: (values[s.key] ?? '').trim()
			}));
			await auth.saveSocials(list);
			await goto('/profile', { replaceState: true });
		} catch {
			error = 'Could not save. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

{#if session.user}
	<AppScreen nav={false}>
		<div class="page">
			<BackHeader title="Social accounts" back="/profile" sub="Add the accounts you want to connect." />
			{#if loaded}
				<div class="list">
					{#each SOCIALS as s (s.key)}
						<label class="row" class:on={(saved[s.key] ?? '') !== ''}>
							<span class="top">
								<span class="lab">{s.label.toUpperCase()}</span>
								<span class="xp">{(saved[s.key] ?? '') !== '' ? 'XP earned' : `+${s.xp} XP`}</span>
							</span>
							<input bind:value={values[s.key]} placeholder={s.placeholder} autocapitalize="none" autocomplete="off" maxlength="60" />
						</label>
					{/each}
				</div>
				<p class="note">All optional. Only the Solu team can see these. Each account you add earns XP once. Linking Discord also gets you your level role on our server once the connection is live.</p>
				{#if error}<div class="form-err" role="alert">{error}</div>{/if}
				<div class="actions">
					<Button onclick={save} loading={busy} disabled={!changed}>Save changes</Button>
					<Button variant="ghost" href="/profile">Cancel</Button>
				</div>
			{/if}
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 28px 36px;
	}
	.list {
		margin-top: 22px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.row {
		display: block;
		padding: 8px 16px 6px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
	}
	.row:focus-within {
		border-color: var(--copper);
	}
	.row.on {
		border-color: rgba(127, 185, 138, 0.6);
	}
	.top {
		display: flex;
		justify-content: space-between;
	}
	.lab {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
	}
	.xp {
		font-size: 10px;
		font-weight: 800;
		color: var(--copper-light);
	}
	.on .xp {
		color: var(--success);
	}
	input {
		width: 100%;
		height: 28px;
		margin-top: 2px;
		padding: 0;
		border: 0;
		outline: none;
		background: transparent;
		color: #fff;
		font-size: 15px;
		font-weight: 600;
	}
	input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}
	.note {
		margin: 16px 4px 0;
		font-size: 11px;
		line-height: 17px;
		color: var(--text-3);
	}
	.form-err {
		margin-top: 10px;
		text-align: center;
		font-size: 12px;
		color: var(--error);
	}
	.actions {
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>

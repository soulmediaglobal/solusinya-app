<script lang="ts">
	import { goto } from '$app/navigation';
	import AppScreen from '#lib/components/AppScreen.svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import { cardFill } from '#lib/format';
	import { auth, loyalty } from '#lib/services';
	import { session } from '#lib/stores/session.svelte';
	import { AppError } from '#lib/types';
	import { isUsable } from '#lib/vouchers';

	$effect(() => {
		if (!session.user) goto('/', { replaceState: true });
	});
	let stamps = $state(0);
	let beans = $state(0);
	let rewards = $state(0);
	$effect(() => {
		if (!session.user) return;
		Promise.all([loyalty.balance(), loyalty.vouchers()]).then(([b, v]) => {
			stamps = cardFill(b.stamps);
			beans = b.beans;
			rewards = v.filter((x) => isUsable(x)).length;
		});
	});
	let password = $state('');
	let error = $state('');
	let busy = $state(false);
	$effect(() => {
		void password;
		error = '';
	});

	async function remove() {
		if (busy) return;
		if (!password) {
			error = 'Enter your password to continue.';
			return;
		}
		busy = true;
		try {
			session.leave();
			await auth.deleteAccount(password);
			// Leave this page first: with no user left, its own guard would send the member to the start screen.
			await goto('/account-deleted', { replaceState: true });
			session.set(null);
			session.stay();
		} catch (e) {
			error = e instanceof AppError && e.code === 'wrong_password' ? 'That password is not correct.' : 'Could not delete your account. Please try again.';
			session.stay();
		} finally {
			busy = false;
		}
	}
</script>

{#if session.user}
	<AppScreen nav={false}>
		<div class="page">
			<BackHeader title="Delete account" back="/profile" />
			<div class="warn">
				<div class="k">THIS CANNOT BE UNDONE</div>
				<ul>
					<li>Your {stamps} stamps and {beans.toLocaleString('id-ID')} beans</li>
					<li>{rewards} unused {rewards === 1 ? 'reward' : 'rewards'}</li>
					<li>Your activity history</li>
					<li>Member ID {session.user.memberId}</li>
				</ul>
			</div>
			<p class="note">Your personal data is removed according to our <a href="/profile/terms">Privacy policy</a>. You can join again anytime with a new account.</p>
			<Field label="Password" eye bind:value={password} placeholder="Enter your password" {error} autocomplete="current-password" />
			<div class="actions">
				<Button variant="danger" onclick={remove} loading={busy}>Delete my account</Button>
				<Button variant="ghost" href="/profile">Keep my account</Button>
			</div>
		</div>
	</AppScreen>
{/if}

<style>
	.page {
		padding: 24px 28px 36px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.warn {
		margin-top: 18px;
		padding: 16px 18px;
		border-radius: 14px;
		border: 1px solid rgba(224, 138, 120, 0.55);
		background: rgba(224, 138, 120, 0.1);
	}
	.k {
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.24em;
		color: var(--error);
	}
	ul {
		margin: 10px 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	li {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12.5px;
		line-height: 18px;
		color: rgba(255, 255, 255, 0.85);
	}
	li::before {
		content: '';
		flex: none;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--error);
	}
	.note {
		margin: 0 4px;
		font-size: 12px;
		line-height: 18px;
		color: var(--text-3);
	}
	.note a {
		color: var(--copper-light);
		font-weight: 700;
	}
	.actions {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>

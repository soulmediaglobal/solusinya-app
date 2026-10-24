<script lang="ts">
	import { onMount } from 'svelte';
	import Button from './Button.svelte';
	import Sheet from './Sheet.svelte';

	interface InstallEvent extends Event {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}
	const KEY = 'solu.install.dismissed';
	const WEEK = 7 * 86_400_000;
	let deferred = $state<InstallEvent | null>(null);
	let ios = $state(false);
	let open = $state(false);

	function dismiss() {
		open = false;
		try {
			localStorage.setItem(KEY, String(Date.now()));
		} catch {
			/* ignore */
		}
	}
	async function install() {
		if (deferred) {
			await deferred.prompt();
			await deferred.userChoice.catch(() => undefined);
		}
		dismiss();
	}
	onMount(() => {
		const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
		if (standalone) return;
		try {
			const at = Number(localStorage.getItem(KEY) ?? 0);
			if (at && Date.now() - at < WEEK) return;
		} catch {
			/* ignore */
		}
		const ua = navigator.userAgent;
		ios = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
		let t: ReturnType<typeof setTimeout> | undefined;
		if (ios) t = setTimeout(() => (open = true), 2500);
		const onPrompt = (e: Event) => {
			e.preventDefault();
			deferred = e as InstallEvent;
			t = setTimeout(() => (open = true), 2500);
		};
		addEventListener('beforeinstallprompt', onPrompt);
		return () => {
			removeEventListener('beforeinstallprompt', onPrompt);
			clearTimeout(t);
		};
	});
</script>

{#if open}
	<Sheet label="Add to home screen" onclose={dismiss}>
		<div class="ico">
			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M12 8v6M9.5 11.5 12 14l2.5-2.5" /></svg>
		</div>
		<h2>Add Solu Club to your home screen</h2>
		<p>Open your member card in one tap, right at the cashier. No download needed.</p>
		{#if ios}<p class="how">On iPhone: tap Share, then Add to Home Screen.</p>{/if}
		<Button onclick={ios ? dismiss : install}>{ios ? 'Got it' : 'Add to home screen'}</Button>
		{#if !ios}<Button variant="ghost" onclick={dismiss}>Not now</Button>{/if}
	</Sheet>
{/if}

<style>
	.ico {
		align-self: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(189, 120, 78, 0.28);
		color: var(--copper-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	h2 {
		margin: 4px 0 0;
		text-align: center;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.2;
	}
	p {
		margin: 0;
		text-align: center;
		font-size: 13px;
		line-height: 20px;
		color: var(--text-2);
	}
	.how {
		color: var(--copper-light);
		font-weight: 600;
	}
</style>

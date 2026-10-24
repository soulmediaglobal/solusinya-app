<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		href,
		variant = 'primary',
		disabled = false,
		loading = false,
		type = 'button',
		onclick
	}: {
		children: Snippet;
		href?: string;
		variant?: 'primary' | 'ghost' | 'danger';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit';
		onclick?: (e: MouseEvent) => void;
	} = $props();
</script>

{#if href && !disabled}
	<a class="btn {variant}" {href}>{@render children()}</a>
{:else}
	<button class="btn {variant}" {type} disabled={disabled || loading} {onclick}>
		{#if loading}<span class="spin" aria-hidden="true"></span>{/if}
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		width: 100%;
		height: 54px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
		font-family: inherit;
	}
	.primary {
		background: var(--grad-primary);
	}
	.ghost {
		background: transparent;
	}
	.danger {
		background: var(--danger);
	}
	.btn:disabled {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.16);
		color: rgba(255, 255, 255, 0.45);
		cursor: not-allowed;
	}
	.spin {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.35);
		border-top-color: #fff;
		animation: s 0.7s linear infinite;
	}
	@keyframes s {
		to {
			transform: rotate(360deg);
		}
	}
</style>

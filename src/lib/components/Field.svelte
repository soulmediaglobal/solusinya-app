<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		label,
		value = $bindable(''),
		error = '',
		hint = '',
		eye = false,
		type = 'text',
		...rest
	}: {
		label: string;
		value?: string;
		error?: string;
		hint?: string;
		eye?: boolean;
		type?: HTMLInputAttributes['type'];
	} & Omit<HTMLInputAttributes, 'value' | 'type'> = $props();

	let shown = $state(false);
	const inputType = $derived(eye ? (shown ? 'text' : 'password') : type);
</script>

<div class="wrap">
	<label class="field" class:err={!!error}>
		<span class="lab">{label}</span>
		<input {...rest} type={inputType} bind:value class:padeye={eye} />
		{#if eye}
			<button
				type="button"
				class="eye"
				aria-label={shown ? 'Hide password' : 'Show password'}
				onclick={() => (shown = !shown)}
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
					<circle cx="12" cy="12" r="3" />
					{#if !shown}<path d="M3 3l18 18" />{/if}
				</svg>
			</button>
		{/if}
	</label>
	{#if error}
		<div class="msg error" role="alert">{error}</div>
	{:else if hint}
		<div class="msg">{hint}</div>
	{/if}
</div>

<style>
	.wrap {
		width: 100%;
	}
	.field {
		position: relative;
		display: block;
		height: 54px;
		padding: 8px 16px 0;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.06);
	}
	.field:focus-within {
		border-color: var(--copper);
	}
	.field.err {
		border-color: var(--error);
	}
	.lab {
		display: block;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: var(--copper-soft);
		text-transform: uppercase;
	}
	input {
		width: 100%;
		height: 26px;
		padding: 0;
		margin-top: 1px;
		font-size: 15px;
		font-weight: 600;
		color: #fff;
		background: transparent;
		border: 0;
		outline: none;
	}
	input::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}
	input.padeye {
		padding-right: 44px;
	}
	.eye {
		position: absolute;
		right: 8px;
		top: 7px;
		width: 40px;
		height: 40px;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--copper-soft);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.msg {
		margin: 6px 4px 0;
		font-size: 11px;
		line-height: 16px;
		color: var(--text-3);
	}
	.msg.error {
		color: var(--error);
	}
</style>

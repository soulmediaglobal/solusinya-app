<script lang="ts">
	import { OTP_LENGTH } from '#lib/config';

	let {
		value = $bindable(''),
		invalid = false,
		oncomplete
	}: { value?: string; invalid?: boolean; oncomplete?: (code: string) => void } = $props();

	let boxes: HTMLInputElement[] = [];
	const digits = $derived(Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? ''));

	function set(next: string) {
		const wasFull = value.length === OTP_LENGTH;
		value = next.replace(/\D/g, '').slice(0, OTP_LENGTH);
		// Auto-submit only when the code becomes complete; editing a full code needs the Verify button.
		if (!wasFull && value.length === OTP_LENGTH) oncomplete?.(value);
	}
	function onInput(i: number, e: Event) {
		const raw = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, '');
		if (!raw) {
			set(value.slice(0, i) + value.slice(i + 1));
			return;
		}
		set(value.slice(0, i) + raw + value.slice(i + 1));
		boxes[Math.min(i + raw.length, OTP_LENGTH - 1)]?.focus();
	}
	function onKey(i: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !digits[i] && i > 0) {
			set(value.slice(0, i - 1) + value.slice(i));
			boxes[i - 1]?.focus();
		}
	}
	function onPaste(e: ClipboardEvent) {
		e.preventDefault();
		set(e.clipboardData?.getData('text') ?? '');
		boxes[Math.min(value.length, OTP_LENGTH - 1)]?.focus();
	}
</script>

<div class="row" role="group" aria-label="6-digit code">
	{#each digits as d, i (i)}
		<input
			bind:this={boxes[i]}
			type="text"
			inputmode="numeric"
			autocomplete={i === 0 ? 'one-time-code' : 'off'}
			maxlength="1"
			aria-label="Digit {i + 1}"
			value={d}
			class:invalid
			oninput={(e) => onInput(i, e)}
			onkeydown={(e) => onKey(i, e)}
			onpaste={onPaste}
		/>
	{/each}
</div>

<style>
	.row {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}
	input {
		width: 100%;
		max-width: 48px;
		height: 60px;
		text-align: center;
		font-size: 24px;
		font-weight: 800;
		color: #fff;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--line);
		border-radius: 12px;
		outline: none;
	}
	input:focus {
		border: 2px solid var(--copper);
	}
	input.invalid {
		border: 1.5px solid var(--error);
	}
</style>

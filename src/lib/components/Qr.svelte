<script lang="ts">
	import QRCode from 'qrcode';

	let { value, size = 200, label = 'Member QR code' }: { value: string; size?: number; label?: string } = $props();
	let svg = $state('');
	$effect(() => {
		const v = value;
		QRCode.toString(v, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#14100c', light: '#00000000' } }).then((s) => {
			if (v === value) svg = s;
		});
	});
</script>

<div class="qr" style:width="{size}px" style:height="{size}px" role="img" aria-label={label}>
	{@html svg}
</div>

<style>
	.qr :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>

<script lang="ts">
	export type IconName = 'home' | 'gift' | 'bean' | 'users' | 'user' | 'bag' | 'plus' | 'qr' | 'copy' | 'chevron' | 'check' | 'lock';
	let { name, size = 20 }: { name: IconName; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === 'home'}
		<path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" />
	{:else if name === 'gift'}
		<rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12" /><path d="M12 8c-1-3-5-3.5-5-1s3 2.5 5 1zM12 8c1-3 5-3.5 5-1s-3 2.5-5 1z" />
	{:else if name === 'bean'}
		<path d="M18.5 5.5c-4-1.5-9 .5-11.5 4.5s-1.5 8 .5 8.5c4 1 9.5-1 11.5-5s1-7-0.5-8z" /><path d="M7.5 18c3-1 6-4 8-9" />
	{:else if name === 'users'}
		<circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5a3 3 0 0 1 0 6M18 14.5c1.8.8 3 2.6 3 4.5" />
	{:else if name === 'user'}
		<circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
	{:else if name === 'bag'}
		<path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
	{:else if name === 'plus'}
		<circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" />
	{:else if name === 'qr'}
		<rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h3v3h-3zM20 14v6h-6" />
	{:else if name === 'copy'}
		<rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" />
	{:else if name === 'chevron'}
		<path d="m9 6 6 6-6 6" />
	{:else if name === 'lock'}
		<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
	{:else if name === 'check'}
		<path d="m5 12.5 4.5 4.5L19 7.5" />
	{/if}
</svg>

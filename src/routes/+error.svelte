<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import StateScreen from '#lib/components/StateScreen.svelte';
</script>

<StateScreen icon="warning" title="Something went wrong" note="We could not load this page. Please try again in a moment.">
	{#snippet actions()}
		<Button onclick={() => location.assign('/home')}>Try again</Button>
		<Button variant="ghost" href="/profile/help">Contact us</Button>
	{/snippet}
</StateScreen>

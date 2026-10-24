<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '#lib/components/Button.svelte';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import { session } from '#lib/stores/session.svelte';

	async function signOut() {
		await session.signOut();
		await goto('/', { replaceState: true });
	}
</script>

<ComingSoon title="Profile" note="Editing your details, photo and social accounts is coming soon.">
	<Button variant="ghost" onclick={signOut}>Sign out</Button>
</ComingSoon>

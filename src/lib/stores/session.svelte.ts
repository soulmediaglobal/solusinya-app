import { auth } from '#lib/services';
import type { Profile } from '#lib/types';

class Session {
	user = $state<Profile | null>(null);
	ready = $state(false);

	async init() {
		this.user = await auth.currentUser();
		this.ready = true;
	}
	set(user: Profile | null) {
		this.user = user;
	}
	async signOut() {
		await auth.signOut();
		this.user = null;
	}
}

export const session = new Session();

import { auth } from '#lib/services';
import { hasSupabase, supabase } from '#lib/services/supabase/client';
import type { Profile } from '#lib/types';

class Session {
	user = $state<Profile | null>(null);
	ready = $state(false);
	/** true when the server ended the session (expired token), as opposed to the member signing out */
	expired = $state(false);
	online = $state(true);
	private leaving = false;

	async init() {
		this.user = await auth.currentUser();
		this.ready = true;
		this.online = navigator.onLine;
		addEventListener('online', () => (this.online = true));
		addEventListener('offline', () => (this.online = false));
		if (hasSupabase) {
			supabase.auth.onAuthStateChange((event) => {
				if (event === 'SIGNED_OUT' && this.user && !this.leaving) {
					this.user = null;
					this.expired = true;
				}
			});
		}
	}
	set(user: Profile | null) {
		this.user = user;
	}
	/** Call right before a deliberate sign-out or account deletion so it is not mistaken for an expired session. */
	leave() {
		this.leaving = true;
	}
	/** Undo `leave()` after a deliberate action failed and the member is still signed in. */
	stay() {
		this.leaving = false;
	}
	async signOut() {
		this.leaving = true;
		await auth.signOut();
		this.user = null;
		this.leaving = false;
	}
	clearExpired() {
		this.expired = false;
	}
}

export const session = new Session();

import type { LoyaltyService } from '../loyalty';

/** Without Supabase there is no shared data, so loyalty is empty and admin tools are disabled. */
export const mockLoyalty: LoyaltyService = {
	async balance() {
		return { stamps: 0, beans: 0, lifetimeBeans: 0 };
	},
	async findMember() {
		return null;
	},
	async recordTransaction() {
		throw new Error('Connect Supabase to record transactions.');
	},
	async recentTransactions() {
		return [];
	}
};

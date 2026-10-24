export interface Balance {
	stamps: number;
	beans: number;
	/** all beans ever earned; spending does not lower it (used for levels later) */
	lifetimeBeans: number;
}
export interface LedgerEntry {
	id: string;
	kind: 'stamp' | 'beans';
	delta: number;
	reason: 'transaction' | 'redeem' | 'reward' | 'adjustment';
	createdAt: string;
	amountRp: number | null;
	outletCode: string | null;
}
/** One purchase with what it earned. */
export interface Activity {
	id: string;
	amountRp: number;
	outletCode: string;
	createdAt: string;
	beans: number;
	stamps: number;
}
export interface Promotion {
	id: string;
	kicker: string;
	title: string;
	subtitle: string;
	/** where the background photo is anchored, in percent */
	focusX: number;
	focusY: number;
}
export interface MemberLookup {
	id: string;
	username: string;
	fullName: string;
	memberId: string;
	outletCode: string;
}
export interface AdminTx {
	id: string;
	amountRp: number;
	outletCode: string;
	createdAt: string;
	username: string;
	memberId: string;
}

export interface LoyaltyService {
	/** Balance of the signed-in member. */
	balance(): Promise<Balance>;
	/** Active banners for the Home slider (max 5), in display order. */
	promotions(): Promise<Promotion[]>;
	/** Signed-in member's ledger, newest first. */
	ledger(): Promise<LedgerEntry[]>;
	/** Signed-in member's latest purchases. */
	activity(limit?: number): Promise<Activity[]>;
	/** Admin: find a member by member ID or username. */
	findMember(query: string): Promise<MemberLookup | null>;
	/** Admin: records a transaction. Gives 1 stamp and beans from the amount (rules live in the database). */
	recordTransaction(member: string, amountRp: number, outletCode: string): Promise<{ stamps: number; beans: number }>;
	/** Admin: latest transactions across all members. */
	recentTransactions(limit?: number): Promise<AdminTx[]>;
}

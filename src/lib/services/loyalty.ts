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
export interface Reward {
	id: string;
	name: string;
	description: string;
	/** null when the reward cannot be bought with beans */
	beansCost: number | null;
}
/** Collecting stamp number `position` on a card unlocks this reward. */
export interface Milestone {
	position: number;
	rewardName: string;
}
export interface Voucher {
	id: string;
	rewardName: string;
	rewardDescription: string;
	source: 'stamp' | 'beans';
	/** stamp position, or beans spent */
	sourceDetail: number;
	status: 'available' | 'active' | 'used';
	expiresAt: string;
	code: string | null;
	codeExpiresAt: string | null;
	usedAt: string | null;
	usedOutlet: string | null;
	createdAt: string;
}
export interface VoucherPeek {
	state: 'valid' | 'used' | 'expired';
	reward: string;
	username: string;
	fullName: string;
	memberId: string;
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

export interface Level {
	level: number;
	name: string;
	minXp: number;
	perks: string;
}
export interface Sticker {
	id: string;
	name: string;
	/** null for seasonal stickers */
	unlockLevel: number | null;
	season: string | null;
	image: string;
}

export interface LoyaltyService {
	/** Signed-in member's XP (beans earned + visits + completed cards). */
	xp(): Promise<number>;
	levels(): Promise<Level[]>;
	stickers(): Promise<Sticker[]>;
	/** Balance of the signed-in member. */
	balance(): Promise<Balance>;
	/** Active banners for the Home slider (max 5), in display order. */
	promotions(): Promise<Promotion[]>;
	/** Beans catalog. */
	rewards(): Promise<Reward[]>;
	milestones(): Promise<Milestone[]>;
	/** Signed-in member's vouchers, newest first (all statuses). */
	vouchers(): Promise<Voucher[]>;
	voucher(id: string): Promise<Voucher | null>;
	/** Spends beans on a reward; the voucher lands in My rewards. */
	redeem(rewardId: string): Promise<{ voucherId: string; beansAfter: number }>;
	/** Issues (or returns the still-valid) 10-minute code for a voucher. */
	activate(voucherId: string): Promise<{ code: string; codeExpiresAt: string }>;
	/** Admin: look at a code without using it. */
	peekVoucher(code: string): Promise<VoucherPeek>;
	/** Admin: mark a code as used at an outlet. */
	useVoucher(code: string, outletCode: string): Promise<{ reward: string; username: string; fullName: string }>;
	/** Signed-in member's ledger, newest first. */
	ledger(): Promise<LedgerEntry[]>;
	/** Signed-in member's latest purchases. */
	activity(limit?: number): Promise<Activity[]>;
	/** Admin: find a member by member ID or username. */
	findMember(query: string): Promise<MemberLookup | null>;
	/** Admin: records a transaction. Gives 1 stamp and beans from the amount (rules live in the database). */
	recordTransaction(member: string, amountRp: number, outletCode: string): Promise<{ stamps: number; beans: number; rewardUnlocked: string | null }>;
	/** Admin: latest transactions across all members. */
	recentTransactions(limit?: number): Promise<AdminTx[]>;
}

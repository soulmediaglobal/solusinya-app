export interface Balance {
	stamps: number;
	beans: number;
	/** all beans ever earned; spending does not lower it (used for levels later) */
	lifetimeBeans: number;
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
	/** Admin: find a member by member ID or username. */
	findMember(query: string): Promise<MemberLookup | null>;
	/** Admin: records a transaction. Gives 1 stamp and beans from the amount (rules live in the database). */
	recordTransaction(member: string, amountRp: number, outletCode: string): Promise<{ stamps: number; beans: number }>;
	/** Admin: latest transactions across all members. */
	recentTransactions(limit?: number): Promise<AdminTx[]>;
}

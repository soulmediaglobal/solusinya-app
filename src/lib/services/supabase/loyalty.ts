import type { AdminTx, Balance, LoyaltyService, MemberLookup } from '../loyalty';
import { supabase } from './client';

const clean = (q: string) => q.trim().replace(/[^A-Za-z0-9._-]/g, '');

export const supabaseLoyalty: LoyaltyService = {
	async balance() {
		const { data } = await supabase.from('member_balances').select('stamps, beans, lifetime_beans').maybeSingle();
		return { stamps: data?.stamps ?? 0, beans: data?.beans ?? 0, lifetimeBeans: data?.lifetime_beans ?? 0 };
	},

	async findMember(query) {
		const q = clean(query);
		if (q.length < 3) return null;
		const { data } = await supabase
			.from('profiles')
			.select('id, username, full_name, member_id, outlet_code')
			.or(`member_id.eq.${q.toUpperCase()},username.eq.${q.toLowerCase()}`)
			.maybeSingle();
		if (!data) return null;
		return {
			id: data.id,
			username: data.username,
			fullName: data.full_name,
			memberId: data.member_id,
			outletCode: data.outlet_code
		} satisfies MemberLookup;
	},

	async recordTransaction(member, amountRp, outletCode) {
		const { data, error } = await supabase.rpc('record_transaction', {
			p_member: member,
			p_amount: amountRp,
			p_outlet: outletCode
		});
		if (error) throw new Error(error.message);
		return { stamps: data.stamps as number, beans: data.beans as number };
	},

	async recentTransactions(limit = 10) {
		const { data } = await supabase
			.from('transactions')
			.select('id, amount_rp, outlet_code, created_at, member:profiles!user_id(username, member_id)')
			.order('created_at', { ascending: false })
			.limit(limit);
		return (data ?? []).map((r) => {
			const m = r.member as unknown as { username: string; member_id: string } | null;
			return {
				id: r.id,
				amountRp: r.amount_rp,
				outletCode: r.outlet_code,
				createdAt: r.created_at,
				username: m?.username ?? '',
				memberId: m?.member_id ?? ''
			} satisfies AdminTx;
		});
	}
};

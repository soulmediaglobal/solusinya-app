import type { Activity, AdminTx, Balance, LedgerEntry, LoyaltyService, MemberLookup, Milestone, Promotion, Reward, Voucher, VoucherPeek } from '../loyalty';
import { supabase } from './client';

async function uid() {
	const { data } = await supabase.auth.getSession();
	return data.session?.user.id ?? '';
}
const VOUCHER_COLS =
	'id, source, source_detail, status, expires_at, code, code_expires_at, used_at, used_outlet, created_at, reward:rewards(name, description)';
function toVoucher(r: Record<string, unknown>): Voucher {
	const rw = r.reward as { name: string; description: string } | null;
	return {
		id: r.id as string,
		rewardName: rw?.name ?? 'Reward',
		rewardDescription: rw?.description ?? '',
		source: r.source as 'stamp' | 'beans',
		sourceDetail: r.source_detail as number,
		status: r.status as Voucher['status'],
		expiresAt: r.expires_at as string,
		code: (r.code as string | null) ?? null,
		codeExpiresAt: (r.code_expires_at as string | null) ?? null,
		usedAt: (r.used_at as string | null) ?? null,
		usedOutlet: (r.used_outlet as string | null) ?? null,
		createdAt: r.created_at as string
	};
}
const clean = (q: string) => q.trim().replace(/[^A-Za-z0-9._-]/g, '');

export const supabaseLoyalty: LoyaltyService = {
	async balance() {
		// Filter by user: admins can read every member's rows, but this is the signed-in member's own balance.
		const { data } = await supabase
			.from('member_balances')
			.select('stamps, beans, lifetime_beans')
			.eq('user_id', await uid())
			.maybeSingle();
		return { stamps: data?.stamps ?? 0, beans: data?.beans ?? 0, lifetimeBeans: data?.lifetime_beans ?? 0 };
	},

	async promotions() {
		const { data } = await supabase
			.from('promotions')
			.select('id, kicker, title, subtitle, focus_x, focus_y')
			.eq('active', true)
			.order('sort')
			.limit(5);
		return (data ?? []).map(
			(r): Promotion => ({ id: r.id, kicker: r.kicker, title: r.title, subtitle: r.subtitle, focusX: r.focus_x, focusY: r.focus_y })
		);
	},

	async rewards() {
		const { data } = await supabase.from('rewards').select('id, name, description, beans_cost').not('beans_cost', 'is', null).order('sort');
		return (data ?? []).map((r): Reward => ({ id: r.id, name: r.name, description: r.description, beansCost: r.beans_cost }));
	},

	async milestones() {
		const { data } = await supabase.from('stamp_milestones').select('position, reward:rewards(name)').order('position');
		return (data ?? []).map((r): Milestone => ({
			position: r.position,
			rewardName: (r.reward as unknown as { name: string } | null)?.name ?? 'Reward'
		}));
	},

	async vouchers() {
		const { data } = await supabase.from('vouchers').select(VOUCHER_COLS).eq('user_id', await uid()).order('created_at', { ascending: false });
		return (data ?? []).map((r) => toVoucher(r as Record<string, unknown>));
	},

	async voucher(id) {
		const { data } = await supabase.from('vouchers').select(VOUCHER_COLS).eq('id', id).eq('user_id', await uid()).maybeSingle();
		return data ? toVoucher(data as Record<string, unknown>) : null;
	},

	async redeem(rewardId) {
		const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId });
		if (error) throw new Error(error.message);
		return { voucherId: data.voucher_id as string, beansAfter: data.beans_after as number };
	},

	async activate(voucherId) {
		const { data, error } = await supabase.rpc('activate_voucher', { p_voucher_id: voucherId });
		if (error) throw new Error(error.message);
		return { code: data.code as string, codeExpiresAt: data.code_expires_at as string };
	},

	async peekVoucher(code) {
		const { data, error } = await supabase.rpc('peek_voucher', { p_code: code });
		if (error) throw new Error(error.message);
		return {
			state: data.state,
			reward: data.reward,
			username: data.username,
			fullName: data.full_name,
			memberId: data.member_id
		} as VoucherPeek;
	},

	async useVoucher(code, outletCode) {
		const { data, error } = await supabase.rpc('use_voucher', { p_code: code, p_outlet: outletCode });
		if (error) throw new Error(error.message);
		return { reward: data.reward as string, username: data.username as string, fullName: data.full_name as string };
	},

	async ledger() {
		const { data } = await supabase
			.from('ledger')
			.select('id, kind, delta, reason, created_at, transaction:transactions(amount_rp, outlet_code)')
			.eq('user_id', await uid())
			.order('created_at', { ascending: false })
			.limit(500);
		return (data ?? []).map((r) => {
			const t = r.transaction as unknown as { amount_rp: number; outlet_code: string } | null;
			return {
				id: r.id,
				kind: r.kind,
				delta: r.delta,
				reason: r.reason,
				createdAt: r.created_at,
				amountRp: t?.amount_rp ?? null,
				outletCode: t?.outlet_code ?? null
			} as LedgerEntry;
		});
	},

	async activity(limit = 5) {
		const { data } = await supabase
			.from('transactions')
			.select('id, amount_rp, outlet_code, created_at, ledger(kind, delta)')
			.eq('user_id', await uid())
			.order('created_at', { ascending: false })
			.limit(limit);
		return (data ?? []).map((r) => {
			const rows = (r.ledger ?? []) as { kind: string; delta: number }[];
			return {
				id: r.id,
				amountRp: r.amount_rp,
				outletCode: r.outlet_code,
				createdAt: r.created_at,
				beans: rows.filter((x) => x.kind === 'beans').reduce((a, x) => a + x.delta, 0),
				stamps: rows.filter((x) => x.kind === 'stamp').reduce((a, x) => a + x.delta, 0)
			} satisfies Activity;
		});
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
		return { stamps: data.stamps as number, beans: data.beans as number, rewardUnlocked: (data.reward_unlocked as string | null) ?? null };
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

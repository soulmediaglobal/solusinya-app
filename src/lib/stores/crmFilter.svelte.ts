/** Date range and outlet shared by the CRM pages, so switching tabs keeps the same view. */
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));

class CrmFilter {
	from = $state(daysAgo(29));
	to = $state(daysAgo(0));
	outlet = $state<string>('');
	get days() {
		return Math.round((new Date(this.to).getTime() - new Date(this.from).getTime()) / 86_400_000) + 1;
	}
	preset(n: number) {
		this.from = daysAgo(n - 1);
		this.to = daysAgo(0);
	}
}
export const crmFilter = new CrmFilter();

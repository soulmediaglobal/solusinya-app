/** Colors used by the CRM charts (brand coppers plus a few clear accents). */
export const PALETTE = ['#bd784e', '#f2e8da', '#7fb98a', '#e08a78', '#8fb4d9', '#d59b75'];
export const OUTLET_COLOR: Record<string, string> = { DRA: '#bd784e', JAT: '#f2e8da', PAM: '#7fb98a', REN: '#8fb4d9' };
export const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
export const short = (n: number) =>
	n >= 1e9 ? (n / 1e9).toFixed(1).replace('.', ',') + ' M' : n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' jt' : n >= 1e3 ? Math.round(n / 1e3) + ' rb' : String(Math.round(n));

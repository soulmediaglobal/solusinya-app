/** Downloads rows as a CSV file (opens fine in Excel and Google Sheets). */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
	const esc = (v: string | number | null | undefined) => {
		const s = v == null ? '' : String(v);
		// Neutralise spreadsheet formulas coming from user-typed text.
		const safe = /^[=+@-]/.test(s) && Number.isNaN(Number(s)) ? "'" + s : s;
		return /[",\n;]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
	};
	const text = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
	const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

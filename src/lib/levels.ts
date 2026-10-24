import type { Level } from './services/loyalty';

export interface LevelState {
	current: Level;
	next: Level | null;
	/** 0–100 progress to the next level */
	pct: number;
	toNext: number;
}
export function levelFor(xp: number, levels: Level[]): LevelState | null {
	if (!levels.length) return null;
	const sorted = [...levels].sort((a, b) => a.minXp - b.minXp);
	let current = sorted[0];
	for (const l of sorted) if (xp >= l.minXp) current = l;
	const next = sorted.find((l) => l.minXp > current.minXp) ?? null;
	const pct = next ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)) : 100;
	return { current, next, pct, toNext: next ? next.minXp - xp : 0 };
}

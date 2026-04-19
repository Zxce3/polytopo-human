import type { TraitKey } from '$lib/types/game';

export type TraitPair = readonly [TraitKey, TraitKey];

export const TRAIT_PAIRS: TraitPair[] = [
	['authority', 'freedom'],
	['collectivism', 'individualism'],
	['spirituality', 'rationalism'],
	['tradition', 'progress'],
	['conformity', 'rebellion'],
] as const;

export interface PairBalance {
	pair: TraitPair;
	leftWidth: number;
	dominant: TraitKey | null;
	scoreA: number;
	scoreB: number;
}

export function getPairBalance(traits: Record<TraitKey, number>): PairBalance[] {
	return TRAIT_PAIRS.map(pair => {
		const [a, b] = pair;
		const scoreA = traits[a] ?? 0;
		const scoreB = traits[b] ?? 0;
		const total = scoreA + scoreB;
		const leftWidth = total === 0 ? 50 : (scoreA / total) * 100;
		const dominant = scoreA > scoreB ? a : scoreB > scoreA ? b : null;
		return { pair, leftWidth, dominant, scoreA, scoreB };
	});
}

export function getDominantTraits(
	traits: Record<TraitKey, number>,
	topN = 3
): { trait: TraitKey; score: number }[] {
	return (Object.entries(traits) as [TraitKey, number][])
		.filter(([, score]) => score > 0)
		.sort(([, a], [, b]) => b - a)
		.slice(0, topN)
		.map(([trait, score]) => ({ trait, score }));
}

export function totalScore(traits: Record<TraitKey, number>): number {
	return Object.values(traits).reduce((s, v) => s + v, 0);
}

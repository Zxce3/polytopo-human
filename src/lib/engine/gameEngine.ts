import type { GameNode, GameSession, TraitKey, Choice, ProfileDefinition, Stage } from '$lib/types/game';

const ALL_TRAITS: TraitKey[] = [
	'authority', 'freedom',
	'collectivism', 'individualism',
	'spirituality', 'rationalism',
	'tradition', 'progress',
	'conformity', 'rebellion',
];

const ZERO_TRAITS = Object.fromEntries(
	ALL_TRAITS.map(t => [t, 0])
) as Record<TraitKey, number>;

export const STAGE_ORDER: Stage[] = ['childhood', 'youth', 'adult', 'elder'];

export const STAGE_LABELS: Record<Stage, string> = {
	childhood: 'Masa Kecil',
	youth: 'Remaja',
	adult: 'Dewasa',
	elder: 'Tua',
};

export class GameEngine {
	private nodes = new Map<string, GameNode>();
	private profiles: ProfileDefinition[] = [];

	get nodeCount(): number {
		return this.nodes.size;
	}

	loadNodes(nodeData: GameNode[]): void {
		for (const node of nodeData) {
			this.nodes.set(node.id, node);
		}
	}

	loadProfiles(profiles: ProfileDefinition[]): void {
		this.profiles = profiles;
	}

	getNode(id: string): GameNode | undefined {
		return this.nodes.get(id);
	}

	getAvailableChoices(node: GameNode, traits: Record<TraitKey, number>): Choice[] {
		return node.choices.filter(choice => {
			if (!choice.condition) return true;
			const { trait, min, max } = choice.condition;
			const value = traits[trait] ?? 0;
			if (min !== undefined && value < min) return false;
			if (max !== undefined && value > max) return false;
			return true;
		});
	}

	applyChoice(session: GameSession, choice: Choice): GameSession {
		const traits = { ...session.traits };
		for (const [key, delta] of Object.entries(choice.traits) as [TraitKey, number][]) {
			traits[key] = (traits[key] ?? 0) + (delta ?? 0);
		}
		const nextId = choice.next ?? 'END';
		const nextNode = this.nodes.get(nextId);
		return {
			...session,
			currentNodeId: nextId,
			traits,
			stage: nextNode?.stage ?? session.stage,
			pathTaken: [...session.pathTaken, nextId],
			choicesMade: [...session.choicesMade, choice.id],
		};
	}

	computeProfile(traits: Record<TraitKey, number>): ProfileDefinition | null {
		if (!this.profiles.length) return null;
		let best = this.profiles[0];
		let bestScore = -Infinity;
		for (const profile of this.profiles) {
			const score = profile.dominantTraits.reduce(
				(sum, t) => sum + (traits[t] ?? 0), 0
			);
			if (score > bestScore) {
				bestScore = score;
				best = profile;
			}
		}
		return best;
	}

	isGameOver(nodeId: string): boolean {
		return nodeId === 'END';
	}

	createSession(startNodeId: string): GameSession {
		const startNode = this.nodes.get(startNodeId);
		return {
			sessionId: crypto.randomUUID(),
			startedAt: new Date().toISOString(),
			currentNodeId: startNodeId,
			traits: { ...ZERO_TRAITS },
			pathTaken: [startNodeId],
			choicesMade: [],
			stage: startNode?.stage ?? 'childhood',
		};
	}

	exportSession(session: GameSession, profileName: string): object {
		return {
			sessionId: session.sessionId,
			startedAt: session.startedAt,
			completedAt: session.completedAt ?? new Date().toISOString(),
			pathTaken: session.pathTaken,
			choicesMade: session.choicesMade,
			finalTraits: session.traits,
			finalProfile: profileName,
		};
	}
}

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { GameEngine } from '$lib/engine/gameEngine';
import type { GameSession, GameNode, ProfileDefinition } from '$lib/types/game';

import childhoodData from '$lib/data/nodes/childhood.json';
import traitsData from '$lib/data/traits.json';

const STORAGE_KEY = 'polytopo_session';
const START_NODE = 'node_c001';

const engine = new GameEngine();
engine.loadNodes(childhoodData as GameNode[]);
engine.loadProfiles(traitsData.profiles as ProfileDefinition[]);

function loadPersistedSession(): GameSession | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as GameSession) : null;
	} catch {
		return null;
	}
}

class GameStore {
	session = $state<GameSession>(
		loadPersistedSession() ?? engine.createSession(START_NODE)
	);

	constructor() {
		$effect.root(() => {
			$effect(() => {
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
				}
			});
		});
	}

	get currentNode(): GameNode | undefined {
		return engine.getNode(this.session.currentNodeId);
	}

	get availableChoices() {
		const node = this.currentNode;
		if (!node) return [];
		return engine.getAvailableChoices(node, this.session.traits);
	}

	get currentProfile(): ProfileDefinition | null {
		return engine.computeProfile(this.session.traits);
	}

	get isComplete(): boolean {
		return engine.isGameOver(this.session.currentNodeId);
	}

	makeChoice(choiceId: string): void {
		const node = this.currentNode;
		if (!node) return;
		const choice = node.choices.find(c => c.id === choiceId);
		if (!choice) return;

		this.session = engine.applyChoice(this.session, choice);

		if (this.isComplete) {
			const profile = this.currentProfile;
			this.session = {
				...this.session,
				completedAt: new Date().toISOString(),
				finalProfile: profile?.name,
			};
			goto('/summary');
		}
	}

	reset(): void {
		this.session = engine.createSession(START_NODE);
		if (browser) localStorage.removeItem(STORAGE_KEY);
	}

	exportSession(): string {
		const profile = this.currentProfile;
		return JSON.stringify(
			engine.exportSession(this.session, profile?.name ?? 'Unknown'),
			null,
			2
		);
	}
}

export const gameStore = new GameStore();
export { engine };

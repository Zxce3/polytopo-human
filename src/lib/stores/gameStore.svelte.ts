import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { GameEngine } from '$lib/engine/gameEngine';
import type { GameSession, GameNode, ProfileDefinition } from '$lib/types/game';

import storiesData from '$lib/data/stories.json';
import { langStore } from '$lib/i18n/lang.svelte';
import { localizeNode, localizeChoices, localizeProfile, localizeStory } from '$lib/i18n/content';
import traitsData from '$lib/data/traits.json';

const STORAGE_KEY = 'polytopo_session';
const START_NODE = 'node_c001';

const engine = new GameEngine();
const nodeModules = import.meta.glob<GameNode[]>('$lib/data/nodes/*.json', {
	eager: true,
	import: 'default',
});
for (const nodes of Object.values(nodeModules)) engine.loadNodes(nodes);
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
		return localizeNode(engine.getNode(this.session.currentNodeId), langStore.lang);
	}

	get availableChoices() {
		const node = engine.getNode(this.session.currentNodeId);
		if (!node) return [];
		return localizeChoices(
			engine.getAvailableChoices(node, this.session.traits),
			node.id,
			langStore.lang
		);
	}

	get currentProfile(): ProfileDefinition | null {
		return localizeProfile(engine.computeProfile(this.session.traits), langStore.lang);
	}

	get isComplete(): boolean {
		return engine.isGameOver(this.session.currentNodeId);
	}

	makeChoice(choiceId: string): void {
		const node = engine.getNode(this.session.currentNodeId);
		if (!node) return;
		const choice = node.choices.find(c => c.id === choiceId);
		if (!choice) return;

		this.session = engine.applyChoice(this.session, choice);

		if (this.isComplete) {
			const profile = engine.computeProfile(this.session.traits);
			this.session = {
				...this.session,
				completedAt: new Date().toISOString(),
				finalProfile: profile?.name,
			};
			goto('/summary');
		}
	}

	startStory(startNodeId: string): void {
		this.session = engine.createSession(startNodeId);
	}

	reset(): void {
		this.session = engine.createSession(START_NODE);
		if (browser) localStorage.removeItem(STORAGE_KEY);
	}

	exportSession(): string {
		const profile = engine.computeProfile(this.session.traits);
		return JSON.stringify(
			engine.exportSession(this.session, profile?.name ?? 'Unknown'),
			null,
			2
		);
	}
}

export const stories: { id: string; title: string; premise: string; start: string }[] = storiesData;
export const localizedStories = () => stories.map((x) => localizeStory(x, langStore.lang));
export const gameStore = new GameStore();
export { engine };

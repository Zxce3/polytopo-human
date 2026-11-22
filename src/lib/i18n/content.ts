import type { Choice, GameNode, ProfileDefinition } from '$lib/types/game';
import type { Lang } from './ui';
import enStories from '$lib/data/en/stories.json';
import enProfiles from '$lib/data/en/profiles.json';
import enTraits from '$lib/data/en/traits.json';
import enTags from '$lib/data/en/tags.json';

type NodeText = { text: string; choices: Record<string, string> };

const enNodes: Record<string, NodeText> = {};
const modules = import.meta.glob<Record<string, NodeText>>('$lib/data/en/nodes/*.json', {
	eager: true,
	import: 'default',
});
for (const m of Object.values(modules)) Object.assign(enNodes, m);

export function localizeNode(node: GameNode | undefined, lang: Lang): GameNode | undefined {
	if (!node || lang === 'id') return node;
	const t = enNodes[node.id];
	if (!t) return node;
	return {
		...node,
		text: t.text,
		tags: node.tags?.map((x) => (enTags as Record<string, string>)[x] ?? x),
	};
}

export function localizeChoices(choices: Choice[], nodeId: string, lang: Lang): Choice[] {
	if (lang === 'id') return choices;
	const texts = enNodes[nodeId]?.choices ?? {};
	return choices.map((c) => (texts[c.id] ? { ...c, text: texts[c.id] } : c));
}

export function localizeStory<T extends { id: string; title: string; premise: string }>(
	story: T,
	lang: Lang
): T {
	if (lang === 'id') return story;
	const t = (enStories as Record<string, { title: string; premise: string }>)[story.id];
	return t ? { ...story, ...t } : story;
}

export function localizeProfile(
	profile: ProfileDefinition | null,
	lang: Lang
): ProfileDefinition | null {
	if (!profile || lang === 'id') return profile;
	const t = (enProfiles as Record<string, { name: string; description: string }>)[profile.id];
	return t ? { ...profile, name: t.name, archetype: profile.archetype, description: t.description } : profile;
}

export function traitLabel(key: string, lang: Lang, idLabel: string): string {
	if (lang === 'id') return idLabel;
	return (enTraits as Record<string, { label: string }>)[key]?.label ?? idLabel;
}

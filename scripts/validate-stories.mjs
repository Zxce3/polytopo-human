// Validates story JSON: unique ids, valid trait keys, resolvable `next`,
// reachability from each story start, and that every story can reach an ending.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/lib/data/', import.meta.url).pathname;
const TRAITS = new Set(['authority','freedom','collectivism','individualism','spirituality','rationalism','tradition','progress','conformity','rebellion']);
const STAGES = new Set(['childhood','youth','adult','elder']);
const errors = [];
const nodes = new Map();
const choiceIds = new Set();

for (const f of readdirSync(join(root, 'nodes')).filter(f => f.endsWith('.json'))) {
	for (const n of JSON.parse(readFileSync(join(root, 'nodes', f), 'utf8'))) {
		if (nodes.has(n.id)) errors.push(`duplicate node id ${n.id}`);
		nodes.set(n.id, n);
		if (!STAGES.has(n.stage)) errors.push(`${n.id}: bad stage ${n.stage}`);
		if (!n.text?.trim()) errors.push(`${n.id}: empty text`);
		if (!n.choices?.length) errors.push(`${n.id}: no choices`);
		for (const c of n.choices ?? []) {
			if (choiceIds.has(c.id)) errors.push(`duplicate choice id ${c.id}`);
			choiceIds.add(c.id);
			if (!c.text?.trim()) errors.push(`${c.id}: empty text`);
			for (const [k, v] of Object.entries(c.traits ?? {}))
				if (!TRAITS.has(k) || typeof v !== 'number') errors.push(`${c.id}: bad trait ${k}`);
			if (c.condition && !TRAITS.has(c.condition.trait)) errors.push(`${c.id}: bad condition trait`);
		}
	}
}
for (const n of nodes.values())
	for (const c of n.choices ?? [])
		if (c.next !== null && !nodes.has(c.next)) errors.push(`${c.id}: next ${c.next} not found`);

const read = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'));
const stories = read('stories.json');
const enStories = read('en/stories.json');
const enProfiles = read('en/profiles.json');
const enTraits = read('en/traits.json');
const enTags = read('en/tags.json');
const reachedAll = new Set();
for (const s of stories) {
	if (!nodes.has(s.start)) { errors.push(`story ${s.id}: start ${s.start} not found`); continue; }
	const seen = new Set();
	const stack = [s.start];
	let ending = false;
	while (stack.length) {
		const id = stack.pop();
		if (seen.has(id)) continue;
		seen.add(id);
		for (const c of nodes.get(id).choices) {
			if (c.next === null) ending = true; else stack.push(c.next);
		}
	}
	if (!ending) errors.push(`story ${s.id}: no ending reachable`);
	seen.forEach(x => reachedAll.add(x));
}
for (const id of nodes.keys()) if (!reachedAll.has(id)) errors.push(`orphan node ${id}`);

// --- English translation completeness and structural parity ---
const enNodes = {};
for (const f of readdirSync(join(root, 'en/nodes')).filter(f => f.endsWith('.json')))
	Object.assign(enNodes, read(`en/nodes/${f}`));
const filled = (x) => typeof x === 'string' && x.trim().length > 0;
for (const n of nodes.values()) {
	const t = enNodes[n.id];
	if (!t) { errors.push(`en: missing node ${n.id}`); continue; }
	if (!filled(t.text)) errors.push(`en: empty text ${n.id}`);
	const have = Object.keys(t.choices ?? {}).sort().join();
	const want = n.choices.map(c => c.id).sort().join();
	if (have !== want) errors.push(`en: choice structure differs at ${n.id}`);
	for (const c of n.choices) if (!filled(t.choices?.[c.id])) errors.push(`en: empty choice ${c.id}`);
	for (const tag of n.tags ?? []) if (!filled(enTags[tag])) errors.push(`en: missing tag ${tag}`);
}
for (const id of Object.keys(enNodes)) if (!nodes.has(id)) errors.push(`en: extra node ${id}`);
for (const s of stories) {
	const t = enStories[s.id];
	if (!filled(t?.title) || !filled(t?.premise)) errors.push(`en: story ${s.id} missing title/premise`);
}
const traitsJson = read('traits.json');
for (const p of traitsJson.profiles) {
	const t = enProfiles[p.id];
	if (!filled(t?.name) || !filled(t?.description)) errors.push(`en: profile ${p.id} missing name/description`);
}
for (const tr of traitsJson.traits) {
	const t = enTraits[tr.key];
	if (!filled(t?.label) || !filled(t?.description)) errors.push(`en: trait ${tr.key} missing label/description`);
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${nodes.size} nodes, ${stories.length} stories`);

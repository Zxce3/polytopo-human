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

const stories = JSON.parse(readFileSync(join(root, 'stories.json'), 'utf8'));
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

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${nodes.size} nodes, ${stories.length} stories`);

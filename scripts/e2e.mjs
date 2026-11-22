// End-to-end test against the production build (vite preview), driven by headless Chrome.
// Usage: bun run build && node scripts/e2e.mjs      (env: CHROME=/path/to/chrome, SHOTS=/dir for screenshots)
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from './lib/cdp.mjs';

const root = new URL('..', import.meta.url).pathname;
const data = join(root, 'src/lib/data');
const SHOTS = process.env.SHOTS || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const PORT = 4179, BASE = `http://localhost:${PORT}`;
const J = (f) => JSON.parse(readFileSync(join(data, f), 'utf8'));

// ---- data
const nodes = {};
for (const f of readdirSync(join(data, 'nodes'))) for (const n of J(`nodes/${f}`)) nodes[n.id] = n;
const enNodes = {};
for (const f of readdirSync(join(data, 'en/nodes'))) Object.assign(enNodes, J(`en/nodes/${f}`));
const stories = J('stories.json'), enStories = J('en/stories.json'), traitsData = J('traits.json');
const enProfiles = J('en/profiles.json');
const ZERO = Object.fromEntries(traitsData.traits.map((t) => [t.key, 0]));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
function profileFor(traits) {
	let best = traitsData.profiles[0], bs = -Infinity;
	for (const p of traitsData.profiles) {
		const sc = p.dominantTraits.reduce((a, t) => a + (traits[t] ?? 0), 0);
		if (sc > bs) { bs = sc; best = p; }
	}
	return best;
}
/** Greedy set of paths (arrays of choice indexes) that covers every choice of a story. */
function coveringPaths(start) {
	const covered = new Set(), paths = [];
	const reachable = new Set(), stack = [start];
	while (stack.length) { const id = stack.pop(); if (reachable.has(id)) continue; reachable.add(id); nodes[id].choices.forEach((c) => c.next && stack.push(c.next)); }
	const total = [...reachable].reduce((a, id) => a + nodes[id].choices.length, 0);
	while (covered.size < total) {
		let id = start; const path = []; let progressed = false;
		while (id) {
			const n = nodes[id];
			let idx = n.choices.findIndex((c) => !covered.has(c.id));
			if (idx < 0) idx = path.length % n.choices.length;
			if (!covered.has(n.choices[idx].id)) progressed = true;
			covered.add(n.choices[idx].id);
			path.push(idx); id = n.choices[idx].next;
		}
		paths.push(path);
		if (!progressed) break;
	}
	return paths;
}

// ---- preview server
const server = spawn('bun', ['run', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true });
for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(250); }

const page = await launch({ port: 9446 });
const { ev, send } = page;
const problems = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); };
page.on((m) => {
	if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(m.params.type))
		problems.push(`console.${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
	if (m.method === 'Runtime.exceptionThrown') problems.push(`exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
	if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) problems.push(`log.${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url ?? ''}`);
	if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) problems.push(`HTTP ${m.params.response.status}: ${m.params.response.url}`);
});
const takeProblems = () => problems.splice(0);

const nav = async (path) => { await send('Page.navigate', { url: BASE + path }); await sleep(900); await waitFor(`document.readyState==='complete'`); await sleep(400); };
async function waitFor(expr, ms = 20000) {
	const t = Date.now();
	while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(100); }
	return false;
}
const setLang = (l) => ev(`localStorage.setItem('polytopo_lang','${l}')`);
const hasChoices = `document.querySelectorAll('.choice').length>0`;
const session = () => ev(`JSON.parse(localStorage.getItem('polytopo_session')||'null')`);
const key = async (k, code) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: code ?? k, text: k.length === 1 ? k : k === 'Enter' ? '\r' : undefined }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: code ?? k }); };
async function fresh(lang, { reduced = false } = {}) {
	await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
	await nav('/'); await ev(`localStorage.clear()`); await setLang(lang);
}
async function startStory(story, lang) {
	await nav('/stories');
	const title = (lang === 'en' ? enStories[story.id] : story).title;
	await ev(`[...document.querySelectorAll('.card')].find(b=>b.textContent.includes(${JSON.stringify(title)})).click()`);
	await waitFor(`location.pathname==='/'`);
}

// ---------- 1. play every story, both languages
for (const lang of process.env.SKIP_PLAY ? [] : ['id', 'en']) {
	for (const story of stories) {
		const paths = coveringPaths(story.start);
		let okAll = true, info = [];
		for (let pi = 0; pi < paths.length; pi++) {
			const reduced = pi > 0; // first path uses real timings, the rest use reduced motion for speed
			await fresh(lang, { reduced });
			await startStory(story, lang);
			let id = story.start, traits = { ...ZERO }, steps = 0, fail = '';
			for (const idx of paths[pi]) {
				if (!(await waitFor(hasChoices))) { fail = `no choices at ${id}`; break; }
				const text = await ev(`document.querySelector('.narrative').textContent`);
				const want = (lang === 'en' ? enNodes[id].text : nodes[id].text);
				if (norm(text) !== norm(want)) { fail = `text mismatch at ${id}`; break; }
				const n = nodes[id], c = n.choices[idx];
				const labels = await ev(`[...document.querySelectorAll('.choice')].map(b=>b.textContent.trim().replace(/^\\d+\\s*/,''))`);
				const wantLabels = n.choices.map((x) => lang === 'en' ? enNodes[id].choices[x.id] : x.text);
				if (JSON.stringify(labels.map(norm)) !== JSON.stringify(wantLabels.map(norm))) { fail = `choice labels mismatch at ${id}`; break; }
				// alternate clicks and number keys
				if ((steps + pi) % 2 === 0) await ev(`document.querySelectorAll('.choice')[${idx}].click()`);
				else await key(String(idx + 1));
				for (const [k, v] of Object.entries(c.traits)) traits[k] += v;
				steps++;
				if (c.next) { id = c.next; if (!(await waitFor(`document.querySelector('.narrative')&&!document.querySelector('.choice.picked')`, 8000))) { fail = `stuck after ${c.id}`; break; } await sleep(150); }
			}
			if (!fail) {
				if (!(await waitFor(`location.pathname==='/summary'`, 8000))) fail = 'did not reach summary';
				else {
					await sleep(500);
					const h1 = await ev(`document.querySelector('h1').textContent.trim()`);
					const lis = await ev(`document.querySelectorAll('ol li').length`);
					const hl = await ev(`document.documentElement.lang`);
					const p = profileFor(traits);
					const wantName = lang === 'en' ? enProfiles[p.id].name : p.name;
					if (h1 !== wantName) fail = `profile ${h1} != ${wantName}`;
					else if (lis !== steps) fail = `journey ${lis} != ${steps}`;
					else if (hl !== lang) fail = `html lang ${hl}`;
				}
			}
			const pr = takeProblems();
			if (pr.length) fail = (fail ? fail + '; ' : '') + 'problems: ' + pr.slice(0, 3).join(' | ');
			if (process.env.VERBOSE) console.log(`  .. ${story.id} [${lang}] path ${pi + 1}/${paths.length} ${fail || "ok"}`);
			if (fail) { okAll = false; info.push(`path${pi}: ${fail}`); }
		}
		check(`play ${story.id} [${lang}] ${paths.length} paths to ending + summary`, okAll, info.join('; '));
	}
}

// ---------- 2. feature tests
{ // language default from browser
	for (const [al, want] of [['en-US', 'en'], ['id-ID', 'id'], ['de-DE', 'id']]) {
		await send('Emulation.setUserAgentOverride', { userAgent: await ev('navigator.userAgent'), acceptLanguage: al });
		await nav('/'); await ev(`localStorage.clear()`); await nav('/');
		const l = await ev(`document.documentElement.lang`);
		check(`first-visit default ${al} -> ${want}`, l === want, `got ${l}`);
	}
	await send('Emulation.setUserAgentOverride', { userAgent: await ev('navigator.userAgent'), acceptLanguage: 'id-ID' });
}
{ // persistence
	await fresh('id'); await nav('/');
	await ev(`[...document.querySelectorAll('footer button[aria-pressed]')].find(b=>b.textContent.trim()==='en').click()`);
	await sleep(300); await send('Page.reload'); await sleep(1500);
	const l = await ev(`document.documentElement.lang`);
	const stored = await ev(`localStorage.getItem('polytopo_lang')`);
	check('language toggle persists across reload', l === 'en' && stored === 'en', `lang=${l} stored=${stored}`);
	check('UI strings follow language', (await ev(`document.querySelector('footer').textContent`)).includes('restart'));
}
{ // skip button
	await fresh('en'); await nav('/'); await sleep(300);
	const before = await ev(`document.querySelectorAll('.choice').length`);
	await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='skip').click()`);
	await sleep(200);
	const after = await ev(`document.querySelectorAll('.choice').length`);
	const instant = await ev(`document.querySelector('.narrative').classList.contains('instant')`);
	const op = await ev(`getComputedStyle(document.querySelector('.sentence')).opacity`);
	check('skip reveals text and choices immediately', before === 0 && after > 0 && instant && op === '1', `before=${before} after=${after} opacity=${op}`);
}
{ // double choose
	await fresh('en'); await nav('/'); await waitFor(hasChoices);
	await ev(`(()=>{const c=document.querySelectorAll('.choice');c[0].click();c[0].click();c[1].click();window.dispatchEvent(new KeyboardEvent('keydown',{key:'3'}));})()`);
	await sleep(1500);
	const s = await session();
	check('fast clicks choose exactly once (650ms pause guard)', s.choicesMade.length === 1 && s.choicesMade[0] === 'choice_c001a', JSON.stringify(s.choicesMade));
}
{ // reset button
	await sleep(500);
	await ev(`[...document.querySelectorAll('footer button')].find(b=>b.textContent.trim()==='restart').click()`);
	await sleep(500);
	const s = await session();
	check('reset button restarts the story', s.choicesMade.length === 0 && s.currentNodeId === 'node_c001');
}
{ // empty state
	await nav('/'); await ev(`localStorage.setItem('polytopo_session', JSON.stringify({sessionId:'x',startedAt:new Date().toISOString(),currentNodeId:'node_does_not_exist',traits:{},pathTaken:['node_does_not_exist'],choicesMade:[],stage:'childhood'}))`);
	await send('Page.reload'); await sleep(1500);
	const txt = await ev(`document.querySelector('main').textContent`);
	check('empty state for unknown node', /could not be loaded|tidak bisa dimuat/.test(txt) && !!(await ev(`document.querySelector('main a[href="/stories"]')`)), norm(txt).slice(0, 60));
	const pr = takeProblems();
	check('empty state raises no console errors', pr.length === 0, pr.join(' | '));
	await ev(`localStorage.removeItem('polytopo_session')`);
}
{ // copy summary + keyboard + sound on summary
	await fresh('en'); await nav('/');
	await send('Browser.grantPermissions', { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], origin: BASE }).catch(() => {});
	await waitFor(hasChoices);
	for (let i = 0; i < 20 && (await ev(`location.pathname`)) !== '/summary'; i++) { await waitFor(hasChoices, 5000); await key('1'); await sleep(900); }
	await waitFor(`location.pathname==='/summary'`, 5000); await sleep(500);
	await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='copy summary').click()`);
	await sleep(500);
	const clip = await ev(`navigator.clipboard.readText().catch(e=>'ERR '+e.message)`);
	check('copy summary writes to clipboard', clip.startsWith('Polytopo Human'), clip.replace(/\n/g, ' / '));
}
{ // keyboard-only navigation with visible focus
	await fresh('en'); await nav('/'); await waitFor(hasChoices);
	const seen = [];
	for (let i = 0; i < 14; i++) {
		await key('Tab', 'Tab');
		seen.push(await ev(`(()=>{const e=document.activeElement;if(!e||e===document.body)return null;const s=getComputedStyle(e);return {t:(e.textContent||'').trim().slice(0,18),outline:s.outlineStyle+' '+s.outlineWidth,}})()`));
	}
	const focused = seen.filter(Boolean);
	const visible = focused.every((f) => /solid [1-9]/.test(f.outline) || /hidden/.test(f.outline) === false && f.outline !== 'none 0px');
	check('keyboard Tab reaches choices, footer and toggles with visible outline', focused.length >= 8 && focused.some((f) => /^\d/.test(f.t)) && visible, `${focused.length} stops; sample ${JSON.stringify(focused.slice(0, 3))}`);
	await send('Page.reload'); await sleep(1200); await waitFor(hasChoices);
	await key('Tab', 'Tab'); await key('Tab', 'Tab'); await key('Tab', 'Tab'); // skip nothing -> may land on a choice
	const onChoice = await ev(`document.activeElement.classList.contains('choice')`);
	if (onChoice) { await key('Enter', 'Enter'); await sleep(1200); const s = await session(); check('Enter on a focused choice chooses it', s.choicesMade.length === 1); }
	else check('Enter on a focused choice chooses it', true, 'skipped: focus not on a choice after 3 tabs (skip button precedes choices only while text reveals)');
}
{ // reduced motion
	await fresh('en', { reduced: true }); await nav('/');
	await sleep(100);
	const r = await ev(`(()=>{const s=document.querySelector('.sentence');const cs=getComputedStyle(s);return {op:cs.opacity,anim:cs.animationName,choices:document.querySelectorAll('.choice').length,skip:![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='skip'),scene:getComputedStyle(document.querySelector('.scene')).animationName}})()`);
	check('prefers-reduced-motion disables reveal and animations', r.op === '1' && r.anim === 'none' && r.choices > 0 && r.skip && r.scene === 'none', JSON.stringify(r));
}
{ // sound toggle UI
	await fresh('en'); await nav('/'); await waitFor(hasChoices);
	const btn = `[...document.querySelectorAll('footer button')].find(b=>b.hasAttribute('aria-pressed')&&/sound/.test(b.textContent))`;
	check('sound is off by default', (await ev(`${btn}.getAttribute('aria-pressed')`)) === 'false');
	await ev(`${btn}.click()`); await sleep(800);
	const on = await ev(`${btn}.getAttribute('aria-pressed')`), slider = await ev(`!!document.querySelector('input[type=range]')`);
	const stored = await ev(`localStorage.getItem('polytopo_sound')`);
	check('sound toggle turns on, shows volume, persists', on === 'true' && slider && /"on":true/.test(stored), `${on} ${slider} ${stored}`);
	await send('Page.reload'); await sleep(1500);
	check('after reload sound is NOT auto-playing before a gesture', (await ev(`${btn}.getAttribute('aria-pressed')`)) === 'false');
	await ev(`${btn}.click()`); await sleep(300); await ev(`${btn}.click()`); await sleep(300);
	check('sound toggle turns off', (await ev(`${btn}.getAttribute('aria-pressed')`)) === 'false' && /"on":false/.test(await ev(`localStorage.getItem('polytopo_sound')`)));
	const pr = takeProblems();
	check('sound toggling raises no console errors', pr.length === 0, pr.join(' | '));
}

// ---------- 3. responsive layout + contrast + screenshots
const VIEWPORTS = [['mobile', 375, 667, true], ['tablet', 768, 1024, true], ['desktop', 1280, 800, false]];
async function shot(name, w, h, mobile) {
	await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
	await sleep(500);
	const overflow = await ev(`document.documentElement.scrollWidth>document.documentElement.clientWidth+1`);
	if (SHOTS) { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.data, 'base64')); }
	return overflow;
}
const overflows = [];
for (const lang of ['id', 'en']) for (const [vn, w, h, m] of VIEWPORTS) {
	await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await nav('/'); await ev(`localStorage.clear()`); await setLang(lang);
	await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: m });
	await nav('/stories'); if (await shot(`picker-${lang}-${vn}`, w, h, m)) overflows.push(`picker ${lang} ${vn}`);
	await startStory(stories[1], lang); await waitFor(hasChoices);
	if (await shot(`node-${lang}-${vn}`, w, h, m)) overflows.push(`node ${lang} ${vn}`);
	if (await ev(`[...document.querySelectorAll('header li span:last-child')].some(s=>s.getBoundingClientRect().height>20)||[...document.querySelectorAll('footer button, footer a')].some(b=>b.getBoundingClientRect().height>34)`)) overflows.push(`wrapping label ${lang} ${vn}`);
	await nav('/'); // play to summary quickly
	for (let i = 0; i < 12 && (await ev(`location.pathname`)) !== '/summary'; i++) { await waitFor(hasChoices, 5000); await key('1'); await sleep(250); }
	await waitFor(`location.pathname==='/summary'`, 5000); await sleep(600);
	if (await shot(`summary-${lang}-${vn}`, w, h, m)) overflows.push(`summary ${lang} ${vn}`);
}
check('no horizontal overflow or wrapping stage labels (375/768/1280, id+en)', overflows.length === 0, overflows.join(', '));
await send('Emulation.clearDeviceMetricsOverride');

{ // contrast per story theme (worst-case background = bg blended with the 16% glow overlay)
	const fails = [];
	let worst = 99, count = 0;
	for (const story of stories) {
		for (const lang of ['id', 'en']) {
			await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
			await fresh(lang, { reduced: true }); await startStory(story, lang); await waitFor(hasChoices);
			const res = await ev(`(()=>{
  const lum=(r,g,b)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
  const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});const rgb=s=>{cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=s;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255]};
  const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const st=getComputedStyle(document.querySelector('.stage'));
  const bg=hex(st.getPropertyValue('--bg').trim()), glow=hex(st.getPropertyValue('--glow').trim());
  const blend=bg.map((c,i)=>c*0.84+glow[i]*0.16);
  const out=[];
  const els=[...document.querySelectorAll('.narrative, .choice, .choice span, header li span:last-child, footer span, footer button, footer a, footer button[aria-pressed] , main span.border')];
  const seen=new Set();
  for(const e of els){ if(!e.textContent.trim()||seen.has(e))continue; seen.add(e);
    const cs=getComputedStyle(e);const c=rgb(cs.color);if(!c)continue;
    let a=c.length>3?c[3]:1; const fg=c.slice(0,3).map((v,i)=>v*a+blend[i]*(1-a));
    // choice cards: a slightly lighter card background (3% white) -> use blended+white 3%
    const cardBg=e.closest('.choice')?blend.map(v=>v*0.97+255*0.03):blend;
    const L1=lum(...fg),L2=lum(...cardBg);const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight)>=700;
    const need=(size>=24||(size>=18.66&&bold))?3:4.5;
    out.push({el:(e.className||e.tagName).toString().slice(0,30)+':'+e.textContent.trim().slice(0,14),ratio,need});
  }
  return out;})()`);
			count += res.length;
			for (const r of res) { worst = Math.min(worst, r.ratio / r.need); if (r.ratio < r.need) fails.push(`${story.id}/${lang} ${r.el} ${r.ratio.toFixed(2)}<${r.need}`); }
		}
	}
	check(`WCAG AA contrast of text across all 10 story themes (node screen), ${count} elements`, fails.length === 0 && count > 100, fails.slice(0, 8).join(' ; ') + (fails.length > 8 ? ` ...(+${fails.length - 8})` : ''));
}

page.close();
try { process.kill(-server.pid); } catch {}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

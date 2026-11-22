// Renders the ambient graph offline for every story theme and asserts the signal
// is audible, not clipping and click-free. Verification is by signal analysis only.
// Usage: node scripts/test-audio.mjs   (needs bun, google-chrome / $CHROME)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch } from './lib/cdp.mjs';

const root = new URL('..', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'polytopo-audio-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `export { buildVoice } from '${root}src/lib/audio';\nexport { THEMES } from '${root}src/lib/theme';\n`);
execFileSync('bun', ['build', entry, '--outfile', join(dir, 'bundle.js'), '--target', 'browser'], { stdio: 'inherit' });
const b64 = readFileSync(join(dir, 'bundle.js')).toString('base64');

const page = await launch({ port: 9445 });
const result = await page.ev(`(async () => {
  const mod = await import('data:text/javascript;base64,${b64}');
  const out = {};
  for (const [id, theme] of Object.entries(mod.THEMES)) {
    out[id] = {};
    for (const [label, vol] of [['default', 0.6], ['max', 1]]) {
      const sr = 44100, secs = 14;
      const ctx = new OfflineAudioContext(1, sr * secs, sr);
      const master = ctx.createGain(); master.gain.value = vol * vol;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
      const v = mod.buildVoice(ctx, master, theme);
      v.out.gain.setValueAtTime(0, 0); v.out.gain.setTargetAtTime(1, 0, 1.5);
      const buf = await ctx.startRendering();
      const d = buf.getChannelData(0);
      const from = sr * 6; let sum = 0, peak = 0, maxDiff = 0;
      for (let i = from; i < d.length; i++) { sum += d[i]*d[i]; peak = Math.max(peak, Math.abs(d[i])); if (i>from) maxDiff = Math.max(maxDiff, Math.abs(d[i]-d[i-1])); }
      let startPeak = 0; for (let i = 0; i < sr; i++) startPeak = Math.max(startPeak, Math.abs(d[i]));
      out[id][label] = { rms: Math.sqrt(sum/(d.length-from)), peak, maxDiff, startPeak, nan: d.some(Number.isNaN) };
    }
  }
  return out;
})()`);
page.close();

let fail = 0;
const db = (x) => (20 * Math.log10(x)).toFixed(1);
console.log('theme  vol      RMS(dBFS) peak   maxStep  firstSecPeak');
for (const [id, r] of Object.entries(result)) {
	for (const [label, m] of Object.entries(r)) {
		const ok = !m.nan && m.rms > 0.003 && m.rms < 0.2 && m.peak < 0.95 && m.maxDiff < 0.1 && m.startPeak < 0.25;
		if (!ok) fail++;
		console.log(`${id.padEnd(5)}  ${label.padEnd(7)}  ${db(m.rms).padStart(6)}   ${m.peak.toFixed(3)}  ${m.maxDiff.toFixed(4)}  ${m.startPeak.toFixed(3)}  ${ok ? 'ok' : 'FAIL'}`);
	}
}
if (fail) { console.error(`${fail} audio checks failed`); process.exit(1); }
console.log('audio OK');

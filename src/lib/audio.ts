// Optional ambient sound generated with Web Audio: no asset files, off by default.
// buildVoice() only needs a BaseAudioContext, so it can also be rendered offline for tests.
import type { StoryTheme } from './theme';

export interface Voice {
	out: GainNode;
	stop(at: number): void;
}

/** Pad (soft drone chord with a slowly moving filter) plus a filtered noise texture. */
export function buildVoice(ctx: BaseAudioContext, dest: AudioNode, theme: StoryTheme): Voice {
	const out = ctx.createGain();
	out.gain.value = 0;
	out.connect(dest);
	const sources: AudioScheduledSourceNode[] = [];

	// --- pad: root, fifth, octave, soft ninth; triangle -> lowpass keeps it warm
	const pad = ctx.createGain();
	pad.gain.value = 0.22;
	const padFilter = ctx.createBiquadFilter();
	padFilter.type = 'lowpass';
	padFilter.frequency.value = 700;
	padFilter.Q.value = 0.4;
	padFilter.connect(pad).connect(out);
	const partials: [number, number, number][] = [
		[1, 0.5, -3],
		[1.5, 0.3, 4],
		[2, 0.22, -5],
		[2.25, 0.08, 6],
		[0.5, 0.35, 0],
	];
	partials.forEach(([mult, amp, cents], i) => {
		const o = ctx.createOscillator();
		o.type = i === 4 ? 'sine' : 'triangle';
		o.frequency.value = theme.hz * mult;
		o.detune.value = cents;
		const g = ctx.createGain();
		g.gain.value = amp;
		// each partial breathes at its own very slow rate
		const l = ctx.createOscillator();
		l.frequency.value = 0.03 + i * 0.013;
		const lg = ctx.createGain();
		lg.gain.value = amp * 0.4;
		l.connect(lg).connect(g.gain);
		o.connect(g).connect(padFilter);
		sources.push(o, l);
	});
	const fl = ctx.createOscillator();
	fl.frequency.value = 0.04;
	const flg = ctx.createGain();
	flg.gain.value = 220;
	fl.connect(flg).connect(padFilter.frequency);
	sources.push(fl);

	// --- noise texture
	const len = Math.floor(ctx.sampleRate * 4);
	const buf = ctx.createBuffer(1, len, ctx.sampleRate);
	const d = buf.getChannelData(0);
	let b0 = 0, b1 = 0, b2 = 0;
	for (let i = 0; i < len; i++) {
		const w = Math.random() * 2 - 1;
		b0 = 0.99765 * b0 + w * 0.099046;
		b1 = 0.963 * b1 + w * 0.2965164;
		b2 = 0.57 * b2 + w * 1.0526913;
		d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
	}
	// crossfade the loop seam so it never clicks
	const x = Math.floor(ctx.sampleRate * 0.1);
	for (let i = 0; i < x; i++) {
		const a = i / x;
		d[i] = d[i] * a + d[len - x + i] * (1 - a);
	}
	const noise = ctx.createBufferSource();
	noise.buffer = buf;
	noise.loop = true;
	noise.loopStart = 0;
	noise.loopEnd = (len - x) / ctx.sampleRate;
	const nf = ctx.createBiquadFilter();
	nf.type = theme.tex.kind;
	nf.frequency.value = theme.tex.freq;
	nf.Q.value = theme.tex.q;
	const ng = ctx.createGain();
	const base = 0.16 * theme.tex.level;
	ng.gain.value = base * (1 - theme.tex.lfoDepth * 0.5);
	const nl = ctx.createOscillator();
	nl.frequency.value = theme.tex.lfoHz;
	const nlg = ctx.createGain();
	nlg.gain.value = base * theme.tex.lfoDepth * 0.5;
	nl.connect(nlg).connect(ng.gain);
	noise.connect(nf).connect(ng).connect(out);
	sources.push(noise, nl);

	for (const s of sources) s.start();
	return {
		out,
		stop(at: number) {
			for (const s of sources) {
				try { s.stop(at); } catch { /* already stopped */ }
			}
		},
	};
}

type Ctor = typeof AudioContext;

class Ambient {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private voice: Voice | null = null;
	private theme: StoryTheme | null = null;
	private volume = 0.6;
	running = false;

	private ensure(): AudioContext | null {
		if (this.ctx) return this.ctx;
		const C: Ctor | undefined =
			typeof AudioContext !== 'undefined'
				? AudioContext
				: (globalThis as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
		if (!C) return null;
		this.ctx = new C();
		const comp = this.ctx.createDynamicsCompressor();
		comp.threshold.value = -24;
		comp.ratio.value = 4;
		this.master = this.ctx.createGain();
		this.master.gain.value = this.level();
		this.master.connect(comp).connect(this.ctx.destination);
		return this.ctx;
	}

	private level(): number {
		return this.volume * this.volume; // perceptual curve
	}

	/** Must be called from a user gesture (click/touch/keydown). */
	async start(theme: StoryTheme): Promise<boolean> {
		const ctx = this.ensure();
		if (!ctx) return false;
		try { await ctx.resume(); } catch { /* ignored */ }
		this.running = true;
		this.setTheme(theme);
		return ctx.state === 'running';
	}

	setTheme(theme: StoryTheme): void {
		this.theme = theme;
		if (!this.running || !this.ctx || !this.master) return;
		const ctx = this.ctx;
		const now = ctx.currentTime;
		const old = this.voice;
		if (old) {
			old.out.gain.cancelScheduledValues(now);
			old.out.gain.setTargetAtTime(0, now, 1.2);
			old.stop(now + 8);
		}
		const v = buildVoice(ctx, this.master, theme);
		v.out.gain.setValueAtTime(0, now);
		v.out.gain.setTargetAtTime(1, now, 1.5);
		this.voice = v;
	}

	setVolume(v: number): void {
		this.volume = Math.min(1, Math.max(0, v));
		if (this.ctx && this.master) {
			this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.1);
		}
	}

	stop(): void {
		this.running = false;
		if (!this.ctx || !this.voice) return;
		const now = this.ctx.currentTime;
		const v = this.voice;
		this.voice = null;
		v.out.gain.cancelScheduledValues(now);
		v.out.gain.setTargetAtTime(0, now, 0.4);
		v.stop(now + 3);
	}

	/** Pause the whole context while the tab is hidden. */
	setHidden(hidden: boolean): void {
		if (!this.ctx || !this.running) return;
		if (hidden) void this.ctx.suspend();
		else void this.ctx.resume();
	}

	get state(): string {
		return this.ctx?.state ?? 'none';
	}
	get currentTheme(): StoryTheme | null {
		return this.theme;
	}
}

export const ambient = new Ambient();

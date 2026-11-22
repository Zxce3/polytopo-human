// Optional ambient drone generated with Web Audio: no asset files, off by default.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let oscs: OscillatorNode[] = [];

export function ambientOn(hz: number): void {
	if (typeof AudioContext === 'undefined') return;
	ctx ??= new AudioContext();
	void ctx.resume();
	stopOscs();
	master ??= ctx.createGain();
	master.gain.value = 0;
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 600;
	master.connect(filter).connect(ctx.destination);
	oscs = [hz, hz * 1.5, hz * 2.01].map((f, i) => {
		const o = ctx!.createOscillator();
		o.type = 'sine';
		o.frequency.value = f;
		o.detune.value = i * 4;
		const g = ctx!.createGain();
		g.gain.value = [0.5, 0.25, 0.12][i];
		o.connect(g).connect(master!);
		o.start();
		return o;
	});
	// very slow swell, then fade in
	const lfo = ctx.createOscillator();
	lfo.frequency.value = 0.07;
	const lfoGain = ctx.createGain();
	lfoGain.gain.value = 0.02;
	lfo.connect(lfoGain).connect(master.gain);
	lfo.start();
	oscs.push(lfo);
	master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 3);
}

function stopOscs(): void {
	for (const o of oscs) {
		try { o.stop(); } catch { /* already stopped */ }
	}
	oscs = [];
}

export function ambientOff(): void {
	if (!ctx || !master) return;
	master.gain.cancelScheduledValues(ctx.currentTime);
	master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
	setTimeout(stopOscs, 900);
}

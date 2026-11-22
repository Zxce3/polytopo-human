export interface StoryTheme {
	bg: string; // base background
	glow: string; // accent used for the ambient glow, rules and focus
	hz: number; // base drone frequency for optional ambient audio
	tex: Texture; // soft noise texture matching the setting
}

export interface Texture {
	kind: 'lowpass' | 'bandpass' | 'highpass';
	freq: number;
	q: number;
	level: number; // relative loudness (0..1)
	lfoHz: number; // slow swell rate
	lfoDepth: number; // 0..1 swell depth
}

const sea: Texture = { kind: 'lowpass', freq: 520, q: 0.5, level: 0.9, lfoHz: 0.11, lfoDepth: 0.7 };
const wind: Texture = { kind: 'bandpass', freq: 420, q: 0.7, level: 0.6, lfoHz: 0.07, lfoDepth: 0.6 };
const rain: Texture = { kind: 'highpass', freq: 2400, q: 0.5, level: 0.35, lfoHz: 0.05, lfoDepth: 0.2 };
const hum: Texture = { kind: 'lowpass', freq: 220, q: 0.7, level: 0.8, lfoHz: 0.06, lfoDepth: 0.3 };
const forest: Texture = { kind: 'bandpass', freq: 1300, q: 0.9, level: 0.3, lfoHz: 0.09, lfoDepth: 0.5 };
const air: Texture = { kind: 'bandpass', freq: 900, q: 0.6, level: 0.18, lfoHz: 0.05, lfoDepth: 0.4 };

// All themes are dark with light text; accent colors keep >= 4.5:1 against bg.
export const THEMES: Record<string, StoryTheme> = {
	desa: { bg: '#110d08', glow: '#d4a35a', hz: 110, tex: wind },
	lyr: { bg: '#07141b', glow: '#6fb7c9', hz: 98, tex: sea },
	pcn: { bg: '#170b0a', glow: '#e07a62', hz: 123, tex: rain },
	tli: { bg: '#0d0f19', glow: '#9fabff', hz: 131, tex: air },
	flr: { bg: '#0b140e', glow: '#9bc77d', hz: 104, tex: wind },
	ptn: { bg: '#081415', glow: '#7ccfc0', hz: 117, tex: rain },
	bnt: { bg: '#111113', glow: '#cdb99a', hz: 87, tex: hum },
	dyk: { bg: '#08130b', glow: '#7fbf6e', hz: 92, tex: forest },
	prk: { bg: '#12130a', glow: '#cdb85a', hz: 100, tex: rain },
	mxc: { bg: '#160d0a', glow: '#e8905e', hz: 115, tex: wind },
};
export const DEFAULT_THEME = THEMES.desa;

export function themeStyle(id: string | undefined): string {
	const t = (id && THEMES[id]) || DEFAULT_THEME;
	return `--bg:${t.bg};--glow:${t.glow};`;
}

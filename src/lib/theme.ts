export interface StoryTheme {
	bg: string; // base background
	glow: string; // accent used for the ambient glow, rules and focus
	hz: number; // base drone frequency for optional ambient audio
}

// All themes are dark with light text; accent colors keep >= 4.5:1 against bg.
export const THEMES: Record<string, StoryTheme> = {
	desa: { bg: '#110d08', glow: '#d4a35a', hz: 110 },
	lyr: { bg: '#07141b', glow: '#6fb7c9', hz: 98 },
	pcn: { bg: '#170b0a', glow: '#e07a62', hz: 123 },
	tli: { bg: '#0d0f19', glow: '#9fabff', hz: 131 },
	flr: { bg: '#0b140e', glow: '#9bc77d', hz: 104 },
	ptn: { bg: '#081415', glow: '#7ccfc0', hz: 117 },
	bnt: { bg: '#111113', glow: '#cdb99a', hz: 87 },
	dyk: { bg: '#08130b', glow: '#7fbf6e', hz: 92 },
	prk: { bg: '#12130a', glow: '#cdb85a', hz: 100 },
	mxc: { bg: '#160d0a', glow: '#e8905e', hz: 115 },
};
export const DEFAULT_THEME = THEMES.desa;

export function themeStyle(id: string | undefined): string {
	const t = (id && THEMES[id]) || DEFAULT_THEME;
	return `--bg:${t.bg};--glow:${t.glow};`;
}

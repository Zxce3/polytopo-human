import { browser } from '$app/environment';
import { UI, type Lang } from './ui';

const KEY = 'polytopo_lang';

function detect(): Lang {
	if (!browser) return 'id';
	try {
		const saved = localStorage.getItem(KEY);
		if (saved === 'id' || saved === 'en') return saved;
	} catch {
		/* storage unavailable */
	}
	const nav = (navigator.language || 'id').toLowerCase();
	return nav.startsWith('en') ? 'en' : 'id';
}

class LangStore {
	lang = $state<Lang>('id');

	/** Resolve saved/browser language after hydration to avoid SSR mismatch. */
	init(): void {
		this.lang = detect();
		document.documentElement.lang = this.lang;
	}

	get t() {
		return UI[this.lang];
	}

	set(lang: Lang): void {
		this.lang = lang;
		if (!browser) return;
		document.documentElement.lang = lang;
		try {
			localStorage.setItem(KEY, lang);
		} catch {
			/* storage unavailable */
		}
	}

	toggle(): void {
		this.set(this.lang === 'id' ? 'en' : 'id');
	}
}

export const langStore = new LangStore();

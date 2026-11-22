import { browser } from '$app/environment';
import { ambient } from '$lib/audio';
import { DEFAULT_THEME, THEMES } from '$lib/theme';

const KEY = 'polytopo_sound';

function read(): { on: boolean; volume: number } {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const p = JSON.parse(raw);
			return { on: p.on === true, volume: typeof p.volume === 'number' ? p.volume : 0.6 };
		}
	} catch {
		/* storage unavailable */
	}
	return { on: false, volume: 0.6 };
}

class SoundStore {
	/** True only while sound is really playing. */
	on = $state(false);
	/** Saved preference is "on" but the browser needs a gesture first. */
	armed = $state(false);
	volume = $state(0.6);
	private themeId: string | undefined;

	private theme() {
		return (this.themeId && THEMES[this.themeId]) || DEFAULT_THEME;
	}

	private save(on: boolean): void {
		try {
			localStorage.setItem(KEY, JSON.stringify({ on, volume: this.volume }));
		} catch {
			/* storage unavailable */
		}
	}

	init(): void {
		if (!browser) return;
		const s = read();
		this.volume = s.volume;
		ambient.setVolume(s.volume);
		document.addEventListener('visibilitychange', () => ambient.setHidden(document.hidden));
		if (s.on) {
			// autoplay policy: wait for the first gesture, then resume the saved preference
			this.armed = true;
			const go = () => {
				removeEventListener('pointerdown', go);
				removeEventListener('keydown', go);
				if (this.armed) void this.enable();
			};
			addEventListener('pointerdown', go);
			addEventListener('keydown', go);
		}
	}

	setTheme(id: string | undefined): void {
		this.themeId = id;
		if (this.on) ambient.setTheme(this.theme());
	}

	private async enable(): Promise<void> {
		this.armed = false;
		const ok = await ambient.start(this.theme());
		this.on = ok;
		this.save(ok);
	}

	/** Call directly from a click handler so the AudioContext may start. */
	async toggle(): Promise<void> {
		if (this.on || this.armed) {
			this.armed = false;
			this.on = false;
			ambient.stop();
			this.save(false);
		} else {
			await this.enable();
		}
	}

	setVolume(v: number): void {
		this.volume = v;
		ambient.setVolume(v);
		this.save(this.on);
	}
}

export const soundStore = new SoundStore();

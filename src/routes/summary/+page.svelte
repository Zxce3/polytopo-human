<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { gameStore } from '$lib/stores/gameStore.svelte';
	import { getPairBalance, getDominantTraits } from '$lib/engine/traitCalculator';
	import { langStore } from '$lib/i18n/lang.svelte';
	import { traitLabel } from '$lib/i18n/content';
	import { themeStyle } from '$lib/theme';
	import traitsData from '$lib/data/traits.json';
	import SoundControl from '$lib/components/SoundControl.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import AmbientShape from '$lib/components/AmbientShape.svelte';

	onMount(() => {
		if (gameStore.session.choicesMade.length === 0) goto('/');
	});

	const traitDefs = traitsData.traits;
	function getTraitLabel(key: string): string {
		return traitLabel(key, langStore.lang, traitDefs.find((t) => t.key === key)?.label ?? key);
	}

	let profile = $derived(gameStore.currentProfile);
	let pairBalances = $derived(getPairBalance(gameStore.session.traits));
	let top = $derived(getDominantTraits(gameStore.session.traits, 3));
	let copied = $state(false);

	function summaryText(): string {
		const name = profile?.name ?? langStore.t.fallbackProfile;
		const traits = top.map((x) => getTraitLabel(x.trait)).join(', ');
		return `Polytopo Human\n${langStore.t.profileIs}: ${name}\n${traits}`;
	}

	async function copySummary(): Promise<void> {
		try {
			await navigator.clipboard.writeText(summaryText());
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			/* clipboard unavailable */
		}
	}

	function downloadSession(): void {
		const data = gameStore.exportSession();
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `polytopo-${gameStore.session.sessionId.slice(0, 8)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const fmt = (iso: string) =>
		new Date(iso).toLocaleDateString(langStore.t.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
</script>

<svelte:head>
	<title>{langStore.t.summaryTitle} — Polytopo Human</title>
</svelte:head>

<div class="stage min-h-screen text-stone-100 px-6 py-12 sm:py-16" style={themeStyle(gameStore.currentStory?.id)}>
	<div class="scene max-w-[38rem] mx-auto">
		<div class="flex justify-end items-center gap-4 mb-6 text-[10px] uppercase tracking-[0.2em] text-stone-400"><SoundControl /><LangToggle /></div>

		<div class="mb-12">
			<p class="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-4 font-sans">
				{langStore.t.summaryKicker}
			</p>
			<h1 class="font-serif text-4xl sm:text-6xl font-bold text-stone-50 mb-2 leading-tight">
				{profile?.name ?? langStore.t.fallbackProfile}
			</h1>
			<p class="text-xs text-stone-400 italic font-sans mb-8 tracking-wide">{profile?.archetype ?? ''}</p>
			<p class="font-serif text-lg sm:text-xl leading-[1.8] text-stone-300">{profile?.description ?? ''}</p>
		</div>

		<div class="mb-16">
			<AmbientShape traits={gameStore.session.traits} label={langStore.t.shapeLabel} />
			<p class="text-center text-[11px] text-stone-400 font-sans mt-2">{langStore.t.shapeLabel}</p>
		</div>

		<div class="mb-16">
			<p class="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-8 font-sans">{langStore.t.valueMap}</p>
			<div class="space-y-8">
				{#each pairBalances as { pair, leftWidth, dominant }}
					{@const [a, b] = pair}
					<div>
						<div class="flex justify-between text-[11px] uppercase tracking-widest mb-2.5 font-sans">
							<span class={dominant === a ? 'text-stone-100' : 'text-stone-400'}>{getTraitLabel(a)}</span>
							<span class={dominant === b ? 'text-stone-100' : 'text-stone-400'}>{getTraitLabel(b)}</span>
						</div>
						<div class="h-px bg-stone-800 relative" role="presentation">
							<div class="absolute top-0 left-0 h-full transition-all duration-1000 ease-out" style="width:{leftWidth}%;background:var(--glow)"></div>
							<div class="absolute top-1/2 left-1/2 -translate-x-px -translate-y-1/2 w-px h-2 bg-stone-600"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="mb-16">
			<p class="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-5 font-sans">{langStore.t.moments}</p>
			<ol class="space-y-4 border-l border-stone-800 pl-5">
				{#each gameStore.journey as step}
					<li class="font-serif text-[1.02rem] leading-relaxed text-stone-300">
						<span class="block text-[10px] uppercase tracking-[0.18em] text-stone-400 font-sans mb-1">
							{langStore.t.stages[step.stage as keyof typeof langStore.t.stages]}
						</span>
						{step.text}
					</li>
				{/each}
			</ol>
			<div class="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-stone-400 font-sans">
				<span>{langStore.t.choicesMade(gameStore.session.choicesMade.length)}</span>
				<span>{langStore.t.started} {fmt(gameStore.session.startedAt)}</span>
				{#if gameStore.session.completedAt}
					<span>{langStore.t.finished} {fmt(gameStore.session.completedAt)}</span>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap gap-x-8 gap-y-3 text-sm font-sans text-stone-300">
			<button type="button" onclick={() => { gameStore.reset(); goto('/'); }} class="underline underline-offset-4 decoration-stone-600 hover:text-white py-1">
				{langStore.t.playAgain}
			</button>
			<button type="button" onclick={() => goto('/stories')} class="underline underline-offset-4 decoration-stone-600 hover:text-white py-1">
				{langStore.t.chooseStory}
			</button>
			<button type="button" onclick={copySummary} class="underline underline-offset-4 decoration-stone-600 hover:text-white py-1">
				{copied ? langStore.t.copied : langStore.t.copySummary}
			</button>
			<button type="button" onclick={downloadSession} class="underline underline-offset-4 decoration-stone-600 hover:text-white py-1">
				{langStore.t.download}
			</button>
		</div>
	</div>
</div>

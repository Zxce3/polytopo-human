<script lang="ts">
	import { goto } from '$app/navigation';
	import { gameStore, localizedStories } from '$lib/stores/gameStore.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import { THEMES, DEFAULT_THEME } from '$lib/theme';
	import LangToggle from '$lib/components/LangToggle.svelte';

	function begin(start: string): void {
		gameStore.startStory(start);
		goto('/');
	}
</script>

<svelte:head>
	<title>{langStore.t.pickerTitle} — Polytopo Human</title>
	<meta name="description" content={langStore.t.pickerMeta} />
</svelte:head>

<div class="stage min-h-screen text-stone-100 px-6 py-12 sm:py-16">
	<main class="scene max-w-3xl mx-auto">
		<div class="flex justify-end mb-6"><LangToggle /></div>
		<h1 class="font-serif text-3xl text-stone-100 mb-2">{langStore.t.pickerTitle}</h1>
		<p class="font-sans text-sm text-stone-400 mb-10 max-w-prose">{langStore.t.pickerIntro}</p>
		<ul class="grid gap-4 sm:grid-cols-2">
			{#each localizedStories() as story}
				{@const th = THEMES[story.id] ?? DEFAULT_THEME}
				<li>
					<button
						type="button"
						onclick={() => begin(story.start)}
						class="card w-full h-full flex flex-col text-left rounded-sm border border-stone-800 overflow-hidden cursor-pointer"
						style="--bg:{th.bg};--glow:{th.glow};"
					>
						<span class="block h-16" style="background:radial-gradient(ellipse at 30% 0%, color-mix(in srgb, {th.glow} 45%, transparent), transparent 75%), {th.bg}" aria-hidden="true"></span>
						<span class="block p-4 flex-1" style="background:{th.bg}">
							<span class="block font-serif text-lg text-stone-100 mb-1">{story.title}</span>
							<span class="block font-sans text-sm leading-snug text-stone-400">{story.premise}</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
		<a href="/" class="inline-block mt-10 text-[11px] uppercase tracking-[0.2em] text-stone-400 hover:text-stone-100 py-2">
			{langStore.t.back}
		</a>
	</main>
</div>

<style>
	.card { transition: border-color 0.25s, transform 0.2s; }
	.card:hover, .card:focus-visible { border-color: var(--glow); transform: translateY(-2px); }
	.card:active { transform: none; }
	@media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }
</style>

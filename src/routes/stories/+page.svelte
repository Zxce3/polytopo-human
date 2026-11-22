<script lang="ts">
	import { goto } from '$app/navigation';
	import { gameStore, localizedStories } from '$lib/stores/gameStore.svelte';

	import { langStore } from '$lib/i18n/lang.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';

	function begin(start: string): void {
		gameStore.startStory(start);
		goto('/');
	}
</script>

<svelte:head>
	<title>{langStore.t.pickerTitle} — Polytopo Human</title>
	<meta
		name="description"
		content={langStore.t.pickerMeta}
	/>
</svelte:head>

<div class="min-h-screen bg-stone-950 text-stone-100 px-6 py-16">
	<main class="max-w-xl mx-auto">
		<div class="flex justify-end mb-6"><LangToggle /></div>
		<h1 class="font-serif text-2xl text-stone-200 mb-2">{langStore.t.pickerTitle}</h1>
		<p class="font-sans text-sm text-stone-500 mb-10">{langStore.t.pickerIntro}</p>
		<ul class="space-y-2">
			{#each localizedStories() as story}
				<li>
					<button
						onclick={() => begin(story.start)}
						class="w-full text-left border-l border-stone-800 hover:border-stone-600
							pl-4 py-3 pr-2 cursor-pointer text-stone-400 hover:text-stone-100 focus-visible:text-stone-100
							transition-colors duration-200"
					>
						<span class="block font-serif text-lg">{story.title}</span>
						<span class="block font-sans text-sm leading-snug">{story.premise}</span>
					</button>
				</li>
			{/each}
		</ul>
		<a href="/" class="inline-block mt-10 text-[9px] uppercase tracking-[0.2em] text-stone-500 hover:text-stone-300">
			{langStore.t.back}
		</a>
	</main>
</div>

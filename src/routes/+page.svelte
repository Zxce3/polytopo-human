<script lang="ts">
	import { gameStore } from '$lib/stores/gameStore.svelte';
	import { STAGE_ORDER } from '$lib/engine/gameEngine';
	import { langStore } from '$lib/i18n/lang.svelte';
	import { themeStyle, THEMES, DEFAULT_THEME } from '$lib/theme';
	import SoundControl from '$lib/components/SoundControl.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { onMount } from 'svelte';

	const STEP = 0.9; // seconds between sentences
	let reduced = $state(false);
	let ready = $state(false);
	let skipped = $state(false);
	let chosen = $state<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		return () => clearTimeout(timer);
	});

	let node = $derived(gameStore.currentNode);
	let sentences = $derived(
		(node?.text ?? '').split(/(?<=[.!?”"])\s+/).filter(Boolean)
	);
	let stageIndex = $derived(STAGE_ORDER.indexOf(gameStore.session.stage));
	let storyId = $derived(gameStore.currentStory?.id);
	let theme = $derived((storyId && THEMES[storyId]) || DEFAULT_THEME);
	let instant = $derived(reduced || skipped);

	// reset reveal state for each node
	$effect(() => {
		void gameStore.session.currentNodeId;
		skipped = false;
		chosen = null;
		clearTimeout(timer);
		if (reduced) {
			ready = true;
			return;
		}
		ready = false;
		timer = setTimeout(() => (ready = true), (sentences.length * STEP + 0.4) * 1000);
	});

	function skip(): void {
		skipped = true;
		ready = true;
		clearTimeout(timer);
	}

	function choose(id: string): void {
		if (chosen || !ready) return;
		chosen = id;
		setTimeout(() => gameStore.makeChoice(id), reduced ? 0 : 650);
	}

	function onKey(e: KeyboardEvent): void {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		const n = Number(e.key);
		if (n >= 1 && n <= gameStore.availableChoices.length) {
			const c = gameStore.availableChoices[n - 1];
			if (ready) choose(c.id);
			else skip();
		} else if (e.key === 'Escape' || (e.key === ' ' && !ready && e.target === document.body)) {
			if (!ready) {
				e.preventDefault();
				skip();
			}
		}
	}

</script>

<svelte:window onkeydown={onKey} />
<svelte:head>
	<title>Polytopo Human</title>
	<meta name="description" content={langStore.t.pageDescription} />
</svelte:head>

<div class="stage min-h-screen flex flex-col text-stone-100" style={themeStyle(storyId)}>
	<!-- Life-stage timeline -->
	<header class="px-6 pt-8 select-none">
		<div class="max-w-[38rem] mx-auto" role="group" aria-label={langStore.t.stageLabel}>
			<ol class="flex items-center gap-2">
				{#each STAGE_ORDER as stg, i}
					<li class="flex-1 flex flex-col gap-2" aria-current={i === stageIndex ? 'step' : undefined}>
						<span
							class="h-px w-full transition-colors duration-1000"
							style="background:{i <= stageIndex ? 'var(--glow)' : '#44403c'};opacity:{i === stageIndex ? 1 : i < stageIndex ? 0.5 : 0.7}"
						></span>
						<span
							class="text-[10px] uppercase tracking-[0.18em] transition-colors duration-700
								{i === stageIndex ? 'text-stone-200' : 'text-stone-500'}"
						>
							{langStore.t.stages[stg]}
						</span>
					</li>
				{/each}
			</ol>
		</div>
	</header>

	<main class="flex-1 flex flex-col px-6 py-10">
		<div class="max-w-[38rem] mx-auto w-full flex-1 flex flex-col justify-center">
			{#if !node}
				<div class="text-center">
					<p class="font-serif text-xl text-stone-300 mb-6">{langStore.t.emptyTitle}</p>
					<a href="/stories" class="underline underline-offset-4 text-stone-300 hover:text-white">
						{langStore.t.emptyAction}
					</a>
				</div>
			{:else}
				{#key gameStore.session.currentNodeId}
					<section class="scene" aria-live="polite">
						<p
							class="narrative font-serif text-[1.2rem] sm:text-[1.35rem] leading-[1.85] text-stone-200 mb-10"
							class:instant
						>
							{#each sentences as sentence, i}
								<span class="sentence" style="animation-delay:{i * STEP}s">{sentence}{' '}</span>
							{/each}
						</p>

						{#if !ready}
							<button
								type="button"
								onclick={skip}
								class="mb-6 text-[10px] uppercase tracking-[0.2em] text-stone-500 hover:text-stone-200
									focus-visible:text-stone-200 px-1 py-2"
							>
								{langStore.t.skip}
							</button>
						{/if}

						{#if node.tags?.length}
							<div class="flex flex-wrap gap-2 mb-8" class:hidden={!ready}>
								{#each node.tags as tag}
									<span class="text-[10px] uppercase tracking-widest text-stone-500 border border-stone-800 px-2 py-0.5 font-sans">
										{tag}
									</span>
								{/each}
							</div>
						{/if}

						{#if ready}
							<div class="choices space-y-3" role="group" aria-label={langStore.t.keyHint}>
								{#each gameStore.availableChoices as choice, i}
									<button
										type="button"
										onclick={() => choose(choice.id)}
										disabled={chosen !== null && chosen !== choice.id}
										aria-pressed={chosen === choice.id}
										class="choice group w-full text-left font-sans text-[1rem] leading-snug
											rounded-sm border px-4 py-4 flex gap-4 items-start cursor-pointer"
										class:picked={chosen === choice.id}
										class:faded={chosen !== null && chosen !== choice.id}
										style="animation-delay:{reduced ? 0 : i * 0.12}s"
									>
										<span class="font-mono text-xs text-stone-500 group-hover:text-stone-300 pt-0.5">{i + 1}</span>
										<span>{choice.text}</span>
									</button>
								{/each}
							</div>
						{/if}
					</section>
				{/key}
			{/if}
		</div>
	</main>

	<footer class="px-6 pb-7 select-none">
		<div class="max-w-[38rem] mx-auto flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
			<span>{langStore.t.choicesCount(gameStore.session.choicesMade.length)}</span>
			<div class="flex items-center gap-4">
				<SoundControl />
				<LangToggle />
				<a href="/stories" class="py-2 hover:text-stone-200 focus-visible:text-stone-200">{langStore.t.chooseStory}</a>
				<button type="button" onclick={() => gameStore.reset()} class="py-2 hover:text-stone-200 focus-visible:text-stone-200">
					{langStore.t.restart}
				</button>
			</div>
		</div>
	</footer>
</div>

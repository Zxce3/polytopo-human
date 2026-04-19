<script lang="ts">
	import { gameStore } from '$lib/stores/gameStore.svelte';
	import { STAGE_ORDER, STAGE_LABELS } from '$lib/engine/gameEngine';
	import { fade } from 'svelte/transition';
</script>

<svelte:head>
	<title>Polytopo Human</title>
	<meta name="description" content="Sebuah perjalanan naratif tentang identitas manusia." />
</svelte:head>

<div class="min-h-screen bg-stone-950 text-stone-100 flex flex-col">

	<!-- Stage progress -->
	<header class="px-6 pt-10 pb-0 select-none">
		<div class="max-w-xl mx-auto">
			<div class="flex items-center gap-0">
				{#each STAGE_ORDER as stage, i}
					{@const active = i === STAGE_ORDER.indexOf(gameStore.session.stage)}
					{@const past = i < STAGE_ORDER.indexOf(gameStore.session.stage)}
					<div class="flex items-center">
						<span
							class="text-[9px] uppercase tracking-[0.2em] transition-colors duration-500
								{active ? 'text-stone-300' : past ? 'text-stone-700' : 'text-stone-800'}"
						>
							{STAGE_LABELS[stage]}
						</span>
						{#if i < STAGE_ORDER.length - 1}
							<span class="mx-3 text-stone-800 text-xs">—</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</header>

	<!-- Game content -->
	<main class="flex-1 flex flex-col px-6 py-10">
		<div class="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center">

			{#key gameStore.session.currentNodeId}
				<div in:fade={{ duration: 500, delay: 200 }} out:fade={{ duration: 250 }}>

					<!-- Narrative text -->
					<p
						class="font-serif text-xl sm:text-[1.375rem] leading-[1.8] text-stone-200 mb-10"
					>
						{gameStore.currentNode?.text ?? ''}
					</p>

					<!-- Tags -->
					{#if gameStore.currentNode?.tags?.length}
						<div class="flex flex-wrap gap-2 mb-8">
							{#each gameStore.currentNode.tags as tag}
								<span
									class="text-[9px] uppercase tracking-widest text-stone-700
										border border-stone-800 px-2 py-0.5 font-sans"
								>
									{tag}
								</span>
							{/each}
						</div>
					{/if}

					<!-- Choices -->
					<div class="space-y-2 mt-2">
						{#each gameStore.availableChoices as choice, i}
							<button
								onclick={() => gameStore.makeChoice(choice.id)}
								class="group w-full text-left font-sans text-[0.95rem] leading-snug
									text-stone-600 hover:text-stone-100
									border-l border-stone-800 hover:border-stone-600
									pl-4 py-3 pr-2
									transition-all duration-200 cursor-pointer"
							>
								<span
									class="font-mono text-xs text-stone-800 group-hover:text-stone-600
										mr-3 transition-colors duration-200"
								>
									{String.fromCharCode(97 + i)}.
								</span>
								{choice.text}
							</button>
						{/each}
					</div>

				</div>
			{/key}

		</div>
	</main>

	<!-- Footer -->
	<footer class="px-6 pb-7 select-none">
		<div class="max-w-xl mx-auto flex justify-between items-center">
			<span class="text-[9px] uppercase tracking-[0.2em] text-stone-800">
				{gameStore.session.choicesMade.length} pilihan
			</span>
			<button
				onclick={() => gameStore.reset()}
				class="text-[9px] uppercase tracking-[0.2em] text-stone-800
					hover:text-stone-600 transition-colors duration-200"
			>
				ulang
			</button>
		</div>
	</footer>

</div>

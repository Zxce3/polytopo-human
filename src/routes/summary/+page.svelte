<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { gameStore } from '$lib/stores/gameStore.svelte';
	import { getPairBalance } from '$lib/engine/traitCalculator';
	import { fade } from 'svelte/transition';
	import traitsData from '$lib/data/traits.json';

	onMount(() => {
		if (gameStore.session.choicesMade.length === 0) {
			goto('/');
		}
	});

	const traitDefs = traitsData.traits;

	function getTraitLabel(key: string): string {
		return traitDefs.find(t => t.key === key)?.label ?? key;
	}

	let profile = $derived(gameStore.currentProfile);
	let pairBalances = $derived(getPairBalance(gameStore.session.traits));

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
</script>

<svelte:head>
	<title>Profil — Polytopo Human</title>
</svelte:head>

<div class="min-h-screen bg-stone-950 text-stone-100 px-6 py-16" in:fade={{ duration: 700 }}>
	<div class="max-w-xl mx-auto">

		<!-- Profile identity -->
		<div class="mb-20">
			<p class="text-[9px] uppercase tracking-[0.2em] text-stone-700 mb-4 font-sans">
				Polytopo Human · Profil Identitasmu
			</p>
			<h1 class="font-serif text-5xl sm:text-6xl font-bold text-stone-100 mb-1 leading-tight">
				{profile?.name ?? 'Sang Pencari'}
			</h1>
			<p class="text-xs text-stone-700 italic font-sans mb-10 tracking-wide">
				{profile?.archetype ?? ''}
			</p>
			<p class="font-serif text-lg sm:text-xl leading-relaxed text-stone-400">
				{profile?.description ?? ''}
			</p>
		</div>

		<!-- Trait value map -->
		<div class="mb-20">
			<p class="text-[9px] uppercase tracking-[0.2em] text-stone-700 mb-8 font-sans">
				Peta Nilai
			</p>
			<div class="space-y-9">
				{#each pairBalances as { pair, leftWidth, dominant, scoreA, scoreB }}
					{@const [a, b] = pair}
					<div>
						<div class="flex justify-between text-[10px] uppercase tracking-widest mb-2.5 font-sans">
							<span class="transition-colors duration-300
								{dominant === a ? 'text-stone-300' : 'text-stone-700'}">
								{getTraitLabel(a)}
								{#if scoreA > 0}
									<span class="text-stone-800 ml-1">{scoreA}</span>
								{/if}
							</span>
							<span class="transition-colors duration-300
								{dominant === b ? 'text-stone-300' : 'text-stone-700'}">
								{#if scoreB > 0}
									<span class="text-stone-800 mr-1">{scoreB}</span>
								{/if}
								{getTraitLabel(b)}
							</span>
						</div>
						<!-- Balance bar -->
						<div class="h-px bg-stone-900 relative">
							<div
								class="absolute top-0 left-0 h-full bg-stone-500 transition-all duration-1000 ease-out"
								style="width: {leftWidth}%"
							></div>
							<!-- Center tick -->
							<div
								class="absolute top-1/2 left-1/2 -translate-x-px -translate-y-1/2
									w-px h-2 bg-stone-800"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Path replay -->
		<div class="mb-20">
			<p class="text-[9px] uppercase tracking-[0.2em] text-stone-700 mb-5 font-sans">
				Jejak Perjalanan
			</p>
			<p class="font-mono text-[11px] text-stone-700 leading-loose break-all">
				{gameStore.session.pathTaken.filter(id => id !== 'END').join(' → ')}
			</p>
			<div class="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-stone-800 font-sans">
				<span>{gameStore.session.choicesMade.length} pilihan dibuat</span>
				<span>
					dimulai {new Date(gameStore.session.startedAt).toLocaleDateString('id-ID', {
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					})}
				</span>
				{#if gameStore.session.completedAt}
					<span>
						selesai {new Date(gameStore.session.completedAt).toLocaleDateString('id-ID', {
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						})}
					</span>
				{/if}
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-8 text-sm font-sans text-stone-600">
			<button
				onclick={() => { gameStore.reset(); goto('/'); }}
				class="hover:text-stone-300 transition-colors duration-200
					underline underline-offset-4 decoration-stone-800 hover:decoration-stone-600"
			>
				main lagi
			</button>
			<button
				onclick={downloadSession}
				class="hover:text-stone-300 transition-colors duration-200
					underline underline-offset-4 decoration-stone-800 hover:decoration-stone-600"
			>
				unduh data sesi
			</button>
		</div>

	</div>
</div>

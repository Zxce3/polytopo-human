<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';
	import { LANGS } from '$lib/i18n/ui';
</script>

<div class="flex items-center gap-1 font-sans text-[10px] uppercase tracking-[0.2em]" role="group" aria-label={langStore.t.languageLabel}>
	{#each LANGS as l}
		<button
			type="button"
			onclick={() => langStore.set(l)}
			aria-pressed={langStore.lang === l}
			lang={l}
			class="px-2 py-1 transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-stone-400
				{langStore.lang === l ? 'text-stone-200' : 'text-stone-500 hover:text-stone-300'}"
		>
			{l}
		</button>
	{/each}
</div>

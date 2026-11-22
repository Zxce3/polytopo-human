<script lang="ts">
	import { soundStore } from '$lib/audio.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
</script>

<div class="flex items-center gap-3">
	<button
		type="button"
		onclick={() => soundStore.toggle()}
		aria-pressed={soundStore.on}
		title={langStore.t.soundHint}
		class="py-2 hover:text-stone-200 focus-visible:text-stone-200"
	>
		{soundStore.on ? langStore.t.soundOff : langStore.t.soundOn}
	</button>
	{#if soundStore.on}
		<input
			type="range"
			min="0"
			max="1"
			step="0.05"
			value={soundStore.volume}
			oninput={(e) => soundStore.setVolume(Number(e.currentTarget.value))}
			aria-label={langStore.t.volume}
			class="w-20 accent-stone-400"
		/>
	{/if}
</div>

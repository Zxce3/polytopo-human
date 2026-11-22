<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import { langStore } from '$lib/i18n/lang.svelte';
	import { onMount } from 'svelte';
	import { soundStore } from '$lib/audio.svelte';
	import { gameStore } from '$lib/stores/gameStore.svelte';

	let { children } = $props();

	onMount(() => {
		langStore.init();
		soundStore.init();
	});
	$effect(() => {
		soundStore.setTheme(gameStore.currentStory?.id);
	});
	$effect(() => {
		document.documentElement.lang = langStore.lang;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#0c0a09" />
	<meta name="description" content={langStore.t.siteDescription} />
	<meta property="og:title" content="Polytopo Human" />
	<meta property="og:description" content={langStore.t.ogDescription} />
	<meta property="og:locale" content={langStore.lang === 'en' ? 'en_GB' : 'id_ID'} />
	<meta property="og:type" content="website" />
</svelte:head>

{@render children()}

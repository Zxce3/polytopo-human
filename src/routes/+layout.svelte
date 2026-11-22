<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#0c0a09" />
	<meta name="description" content="Gim naratif berbasis pilihan tentang bagaimana lingkungan, pengasuhan, dan konteks membentuk identitas manusia." />
	<meta property="og:title" content="Polytopo Human" />
	<meta property="og:description" content="Gim naratif berbasis pilihan tentang pembentukan identitas manusia." />
	<meta property="og:type" content="website" />
</svelte:head>

{@render children()}

<script lang="ts">
	import traitsData from '$lib/data/traits.json';
	import type { TraitKey } from '$lib/types/game';

	let { traits, label }: { traits: Record<TraitKey, number>; label: string } = $props();

	const keys = traitsData.traits;
	let max = $derived(Math.max(1, ...Object.values(traits)));
	// ten soft blobs placed around a circle; size and opacity follow each trait's weight
	let blobs = $derived(
		keys.map((t, i) => {
			const w = (traits[t.key as TraitKey] ?? 0) / max;
			const a = (i / keys.length) * Math.PI * 2 - Math.PI / 2;
			return {
				color: t.color,
				x: 150 + Math.cos(a) * (40 + 30 * (1 - w)),
				y: 150 + Math.sin(a) * (40 + 30 * (1 - w)),
				r: 14 + w * 52,
				o: 0.12 + w * 0.6,
				d: 14 + (i % 4) * 4,
			};
		})
	);
</script>

<svg viewBox="0 0 300 300" role="img" aria-label={label} class="w-full max-w-xs mx-auto block">
	<defs>
		<filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="16" />
		</filter>
	</defs>
	<g filter="url(#soft)" style="mix-blend-mode:screen">
		{#each blobs as b, i}
			<circle class="blob" cx={b.x} cy={b.y} r={b.r} fill={b.color} opacity={b.o} style="animation-duration:{b.d}s;animation-delay:-{i * 2}s" />
		{/each}
	</g>
</svg>

<style>
	.blob {
		transform-box: fill-box;
		transform-origin: center;
		animation: drift ease-in-out infinite alternate;
		transition: r 1.2s ease, opacity 1.2s ease;
	}
	@keyframes drift {
		from { transform: translate(-5px, 3px) scale(0.96); }
		to { transform: translate(5px, -3px) scale(1.06); }
	}
	@media (prefers-reduced-motion: reduce) {
		.blob { animation: none; transition: none; }
	}
</style>

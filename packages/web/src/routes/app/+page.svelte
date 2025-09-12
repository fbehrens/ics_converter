<script lang="ts">
	import welcome from '$lib/images/svelte-welcome.webp';
	import welcomeFallback from '$lib/images/svelte-welcome.png';
	import { version } from 'parser';
	const { data } = $props();
	const { FOO } = data;
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app version" />
</svelte:head>

<section>
	<h1>ics-converter for tajet-garden</h1>

	<h2>
		try editing <strong>src/routes/+page.svelte</strong>
	</h2>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}
</style>

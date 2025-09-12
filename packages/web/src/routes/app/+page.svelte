<script lang="ts">
	const { data } = $props();

	function download() {
		const blob = new Blob(['hello\nworld'], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'hello-world.csv';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app version" />
</svelte:head>

<section>
	<h1>ics-converter for tajet-garden</h1>
	<h2>
		<button onclick={download}>export filtet and transform calender</button>
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

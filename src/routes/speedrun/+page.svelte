<script lang="ts">
	import QuizRunner from '$lib/components/QuizRunner.svelte';
</script>

<QuizRunner
	title="Speedrun"
	subtitle="Ten or twenty questions: estimate η and mismatch loss, then study the dominant effect."
	limit={20}
	lengths={[10, 20]}
/>

<script lang="ts">
	let { form } = $props();
	let errorMessage = $derived(form?.message ?? null);
</script>

<section class="login-panel">
	<h1>Admin Login</h1>
	<p>Authorized crew only. Sessions expire after 30 minutes.</p>

	{#if errorMessage}
		<div class="alert">{errorMessage}</div>
	{/if}

	<form method="POST">
		<label>
			Username
			<input type="text" name="username" autocomplete="username" required />
		</label>
		<label>
			Password
			<input type="password" name="password" autocomplete="current-password" required />
		</label>
		<button type="submit">Log in</button>
	</form>
</section>

<style>
	.login-panel {
		max-width: 420px;
		margin: 4rem auto;
		background: rgba(7, 9, 20, 0.9);
		padding: 2rem;
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 15px 60px rgba(0, 0, 0, 0.35);
	}

	h1 {
		margin: 0 0 0.25rem;
		color: #f7e99a;
	}

	p {
		margin-top: 0;
		color: #9eb7d3;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.25rem;
	}

	label {
		display: flex;
		flex-direction: column;
		font-size: 0.9rem;
		color: #c9d9ee;
	}

	input {
		margin-top: 0.35rem;
		padding: 0.75rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(3, 5, 10, 0.85);
		color: #fff;
	}

	button {
		padding: 0.9rem;
		border: none;
		border-radius: 16px;
		background: linear-gradient(120deg, #ff7f11, #c9184a);
		color: #fff;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
	}

	.alert {
		background: rgba(227, 86, 86, 0.18);
		color: #ffb4b4;
		border: 1px solid rgba(227, 86, 86, 0.3);
		padding: 0.75rem 1rem;
		border-radius: 12px;
		margin-top: 1rem;
	}

</style>

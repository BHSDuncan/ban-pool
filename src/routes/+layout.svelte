<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	let user = $derived(data?.user ?? null);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Captain Jack - Ban Pool</title>
</svelte:head>

<div class="app-shell">
	<header class="top-bar">
		<div class="brand">
			<a href="/">🏴‍☠️ Captain Jack - Ban Pool</a>
		</div>
		<nav>
			<a href="/">Calendar</a>
			<a href="/winners">Winners</a>
			{#if user}
				<form method="POST" action="/admin/logout" class="logout-form">
					<span>Ahoy, {user.username}!</span>
					<button type="submit">Log out</button>
				</form>
			{:else}
				<a href="/admin/login">Admin</a>
			{/if}
		</nav>
	</header>
	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		background: radial-gradient(circle at top, #1c1b2b 0%, #080809 70%);
		color: #f0f0f2;
		min-height: 100vh;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(a) {
		color: #7ce3ff;
		text-decoration: none;
	}

	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 2rem;
		background: rgba(6, 8, 16, 0.9);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(12px);
	}

	.brand a {
		font-size: 1.2rem;
		font-weight: 600;
		color: #f7e99a;
	}

	nav {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	nav a {
		padding: 0.4rem 0.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.05);
		transition: background 0.2s ease;
	}

	nav a:hover {
		background: rgba(248, 192, 80, 0.3);
	}

	.logout-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		background: rgba(248, 192, 80, 0.15);
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
	}

	.logout-form span {
		font-size: 0.9rem;
		color: #f7e99a;
	}

	.logout-form button {
		background: #e63946;
		border: none;
		color: white;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		cursor: pointer;
		font-weight: 600;
	}

	main {
		flex: 1;
		padding: 2rem;
		width: min(1200px, 100%);
		margin: 0 auto;
	}

	@media (max-width: 640px) {
		.top-bar {
			flex-direction: column;
			gap: 0.75rem;
			text-align: center;
		}

		nav {
			flex-wrap: wrap;
			justify-content: center;
		}

		main {
			padding: 1.25rem;
		}
	}
</style>

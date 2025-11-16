<script lang="ts">
	let { data } = $props();
	const allSortOptions = [
		{ value: 'date_desc', label: 'Date (newest first)' },
		{ value: 'date_asc', label: 'Date (oldest first)' },
		{ value: 'name_asc', label: 'Name (A → Z)' },
		{ value: 'name_desc', label: 'Name (Z → A)' }
	];

	const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

	function formatDate(iso: string) {
		return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(iso));
	}
</script>

<section class="panel">
	<header>
			<div>
				<h1>Previous Winners</h1>
				<p>Every ban resets the pool. Track bragging rights across the seasons.</p>
			</div>
		<form method="GET" class="controls">
			<label>
				Sort
				<select name="sort" value={data.sort}>
					{#each allSortOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>
				Per Page
				<select name="pageSize" value={String(data.pageSize)}>
					{#each data.pageSizes as size (size)}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</label>
			<input type="hidden" name="page" value="1" />
			<button type="submit">Apply</button>
		</form>
	</header>

	<table>
		<thead>
			<tr>
				<th scope="col">Banning date</th>
				<th scope="col">Winner</th>
			</tr>
		</thead>
		<tbody>
			{#if data.winners.length === 0}
				<tr>
					<td colspan="2">No bans have been recorded yet.</td>
				</tr>
			{:else}
				{#each data.winners as winner (winner.date + (winner.winnerName ?? ''))}
					<tr>
						<td>{formatDate(winner.date)}</td>
						<td>{winner.winnerName ?? 'No winner.'}</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>

	<footer class="pagination">
		<form method="GET">
			<input type="hidden" name="sort" value={data.sort} />
			<input type="hidden" name="pageSize" value={data.pageSize} />
			<button type="submit" name="page" value={Math.max(1, data.page - 1)} disabled={data.page <= 1}>
				Prev
			</button>
			<span>Page {data.page} of {totalPages}</span>
			<button
				type="submit"
				name="page"
				value={Math.min(totalPages, data.page + 1)}
				disabled={data.page >= totalPages}
			>
				Next
			</button>
		</form>
	</footer>
</section>

<style>
	.panel {
		background: rgba(5, 8, 18, 0.85);
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 2rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}

	header h1 {
		margin: 0;
		color: #f7e99a;
	}

	header p {
		margin: 0.25rem 0 0;
		color: #95adc8;
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		background: rgba(255, 255, 255, 0.04);
		padding: 0.75rem 1rem;
		border-radius: 16px;
	}

	.controls label {
		display: flex;
		flex-direction: column;
		font-size: 0.85rem;
		color: #d0def0;
	}

	.controls select {
		margin-top: 0.2rem;
		background: #020409;
		color: #fff;
		border-radius: 10px;
		padding: 0.4rem 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.controls button {
		background: #e85d04;
		border: none;
		border-radius: 999px;
		color: #fff;
		padding: 0.5rem 1.2rem;
		font-weight: 600;
		cursor: pointer;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1.5rem;
	}

	th,
	td {
		text-align: left;
		padding: 0.75rem 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	th {
		color: #8aaed1;
		font-size: 0.95rem;
		font-weight: 600;
	}

	td {
		color: #f0f4ff;
	}

	.pagination {
		margin-top: 1.5rem;
		text-align: center;
	}

	.pagination form {
		display: inline-flex;
		gap: 1rem;
		align-items: center;
	}

	.pagination button {
		background: rgba(255, 255, 255, 0.1);
		border: none;
		color: #fff;
		padding: 0.35rem 1.2rem;
		border-radius: 999px;
		cursor: pointer;
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination span {
		color: #9fb2ca;
	}

	@media (max-width: 720px) {
		.controls {
			flex-direction: column;
		}

		.controls label {
			width: 100%;
		}

		.controls select {
			width: 100%;
		}
	}
</style>

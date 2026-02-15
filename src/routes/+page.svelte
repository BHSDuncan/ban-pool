<script lang="ts">
	import { goto } from '$app/navigation';
	import { SvelteDate, SvelteMap } from 'svelte/reactivity';

	let { data } = $props();

	let participants = $derived.by(() => {
		const map = new SvelteMap<string, string>();
		for (const entry of data.participants ?? []) {
			const iso = entry.date.slice(0, 10);
			map.set(iso, entry.name);
		}
		return map;
	});

	const bans = $derived.by(() => {
		const map = new SvelteMap<string, string | null>();
		for (const ban of data.bans ?? []) {
			map.set(ban.date, ban.winnerName ?? null);
		}
		return map;
	});

	let todayIso = $derived(data.today.slice(0, 10));
	let daysSinceMostRecentBan = $derived.by(() => {
		if (!data.latestBanDate) {
			return null;
		}
		const [year, month, day] = data.latestBanDate.split('-').map(Number);
		const banStart = new SvelteDate(year, month - 1, day);
		const now = new SvelteDate();
		const todayStart = new SvelteDate(now.getFullYear(), now.getMonth(), now.getDate());
		const diffMs = todayStart.getTime() - banStart.getTime();
		return Math.max(0, Math.floor(diffMs / 86_400_000));
	});

	let referenceDate = $derived.by(() => new SvelteDate(`${data.referenceMonthParam}-01T00:00:00`));

	let monthLabel = $derived.by(() =>
		new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(referenceDate)
	);

	type CalendarDay = { iso: string; label: number; inMonth: boolean; name?: string; banned: boolean };

	let calendarWeeks = $derived.by<CalendarDay[][]>(() => {
		const year = referenceDate.getFullYear();
		const monthIndex = referenceDate.getMonth();
		const first = new SvelteDate(year, monthIndex, 1);
		const firstDay = first.getDay();
		const weeks: CalendarDay[][] = [];
		let dayOffset = 1 - firstDay;
		for (let week = 0; week < 6; week += 1) {
			const row: CalendarDay[] = [];
			for (let day = 0; day < 7; day += 1) {
				const cellDate = new SvelteDate(year, monthIndex, dayOffset);
				const iso = cellDate.toISOString().slice(0, 10);
				row.push({
					iso,
					label: cellDate.getDate(),
					inMonth: cellDate.getMonth() === monthIndex,
					name: participants.get(iso),
					banned: bans.has(iso)
				});
				dayOffset += 1;
			}
			weeks.push(row);
		}
		return weeks;
	});

	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	let modalContent = $state<{
		title: string;
		description?: string;
		descriptionHtml?: string;
	} | null>(null);

	function describeDay(day: CalendarDay) {
		const winnerName = bans.get(day.iso);
		const isPast = day.iso < todayIso;
		if (day.banned) {
			return {
				title: `Ban: ${day.iso}`,
				descriptionHtml: winnerName ? `Winner: <strong>${winnerName}</strong>` : 'No winner.'
			};
		}
		if (day.name) {
			return {
				title: `Claimed: ${day.iso}`,
				descriptionHtml: `<strong>${day.name}</strong> has this date locked.`
			};
		}
		if (isPast) {
			return {
				title: `Past date: ${day.iso}`,
				description: 'No pick was made for this day.'
			};
		}
		return {
			title: `Open date: ${day.iso}`,
			description: 'Available for the next season.'
		};
	}

	function openModal(day: CalendarDay) {
		modalContent = describeDay(day);
	}

	function closeModal() {
		modalContent = null;
	}

	function navigate(offset: number) {
		const target = new SvelteDate(referenceDate);
		target.setMonth(target.getMonth() + offset);
		const param = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
		goto(`/?month=${param}`, { invalidateAll: true, noScroll: true });
	}
</script>

<section class="hero">
	<div>
		<h1>The Ban Pool</h1>
		<p>
			Pick your day, share your hunch, and await Captain Jack's next banning decree. Only one
			participant can claim each date.
		</p>
		<p aria-hidden="true">&nbsp;</p>
		<p class="ban-counter">
			{#if daysSinceMostRecentBan === null}
				No bans have been recorded yet.
			{:else}
				-=- Days since last ban: {daysSinceMostRecentBan} -=-
			{/if}
		</p>
	</div>
	<p aria-hidden="true">&nbsp;</p>

	<p class="tagline">Jack's decree rings sharp and frank; n'er-do-wells go walk the plank.</p>
</section>

<section class="calendar-panel">
	<header>
		<button type="button" onclick={() => navigate(-1)} aria-label="View previous month">⟵</button>
		<h2>{monthLabel}</h2>
		<button type="button" onclick={() => navigate(1)} aria-label="View next month">⟶</button>
	</header>
	<div class="weekday-row">
		{#each weekdays as day (day)}
			<span>{day}</span>
		{/each}
	</div>
	<div class="weeks">
		{#each calendarWeeks as week, index (index)}
			<div class="week">
				{#each week as day (day.iso)}
					{@const isBanned = day.banned}
					{@const winnerName = bans.get(day.iso)}
					{@const isPast = day.iso < todayIso}
					<button
						type="button"
						class={`day ${day.inMonth ? '' : 'muted'} ${day.iso === todayIso ? 'today' : ''} ${day.name ? 'claimed' : ''} ${isPast ? 'past' : ''} ${isBanned ? 'banned' : ''}`}
						onclick={() => openModal(day)}
						aria-label={`Details for ${day.iso}`}
					>
						<span class="date">{day.label}</span>
						{#if isBanned}
							<span class="ban-label">BAN!</span>
							<span class="winner-label">{winnerName ? `Winner: ${winnerName}` : 'No winner.'}</span>
						{:else if day.name}
							<strong class="participant-label">{day.name}</strong>
						{:else if !isPast}
							<small>Open</small>
						{/if}
					</button>
				{/each}
			</div>
		{/each}
	</div>
	<p class="legend">Claimed days glow with a vibrant parrot green. Empty slots await brave guesses.</p>
</section>

{#if modalContent}
	<div
		class="modal-overlay"
		role="button"
		tabindex="0"
		aria-label="Close calendar details"
		onclick={closeModal}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				closeModal();
			}
		}}
	>
		<div
			class="modal-card"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<h3>{modalContent.title}</h3>
			{#if modalContent.descriptionHtml}
				<p>{@html modalContent.descriptionHtml}</p>
			{:else if modalContent.description}
				<p>{modalContent.description}</p>
			{/if}
		</div>
	</div>
{/if}

<section class="cta">
	<h3>Think you know the next banning date?</h3>
	<p>Tap your favorite bartender and ask for access — or, if you're the admin, head to the control room.</p>
	<a class="cta-btn" href="/admin/login">Admin Portal</a>
</section>

<style>
	.hero {
		background: linear-gradient(120deg, rgba(8, 22, 40, 0.95), rgba(17, 63, 94, 0.85));
		padding: 2rem;
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		margin-bottom: 2rem;
	}

	.hero h1 {
		margin: 0 0 0.5rem;
		font-size: clamp(2.1rem, 4vw, 3rem);
		color: #f7e99a;
	}

	.hero p {
		margin: 0;
		color: #d6f5ff;
		max-width: 60ch;
	}

	.ban-counter {
		margin-top: 0.75rem;
		font-weight: 600;
		color: #ffb86b;
	}

	.tagline {
		margin-top: 1rem;
		font-style: italic;
		color: #9bb0c7;
	}


	.calendar-panel {
		background: rgba(6, 9, 18, 0.85);
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1.5rem;
	}

	.calendar-panel header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.calendar-panel header button {
		background: rgba(255, 255, 255, 0.08);
		border: none;
		color: #fff;
		font-size: 1.2rem;
		border-radius: 50%;
		width: 2.5rem;
		height: 2.5rem;
		cursor: pointer;
	}

	.weekday-row,
	.weeks {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.weekday-row {
		margin-bottom: 0.5rem;
		text-align: center;
		font-weight: 600;
		color: #8aaed1;
	}

	.week {
		display: contents;
	}

	.day {
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 0.75rem;
		min-height: 90px;
		background: rgba(15, 16, 28, 0.8);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		position: relative;
		width: 100%;
		text-align: left;
		cursor: pointer;
	}

	.day.today {
		border-color: rgba(248, 202, 88, 0.95);
		box-shadow: 0 0 12px rgba(248, 202, 88, 0.4);
	}

	.day.claimed {
		background: linear-gradient(135deg, rgba(22, 54, 35, 0.9), rgba(30, 78, 55, 0.9));
		border-color: rgba(126, 227, 121, 0.7);
	}

	.day.banned {
		background: linear-gradient(135deg, rgba(92, 18, 28, 0.9), rgba(171, 28, 43, 0.9));
		border-color: rgba(255, 99, 99, 0.8);
		box-shadow: 0 0 14px rgba(255, 79, 79, 0.4);
	}

	.day.past {
		opacity: 0.45;
	}

	.ban-label {
		color: #6fd3ff;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.winner-label {
		color: #cfd4dd;
		font-weight: 400;
	}

	@media (max-width: 640px) {
		.participant-label,
		.winner-label {
			display: none;
		}
	}

	.day.muted {
		opacity: 0.35;
	}

	.day .date {
		font-size: 0.85rem;
		color: #9bb0c7;
	}

	.day strong {
		color: #7fe795;
		font-size: 0.95rem;
	}

	.day small {
		color: rgba(255, 255, 255, 0.4);
	}

	.legend {
		margin-top: 1rem;
		color: #9bb0c7;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 10;
	}

	.modal-card {
		background: rgba(10, 12, 22, 0.95);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		width: min(360px, 90vw);
		box-shadow: 0 15px 45px rgba(0, 0, 0, 0.5);
	}

	.modal-card h3 {
		margin: 0 0 0.5rem;
		color: #f7e99a;
	}

	.modal-card p {
		margin: 0;
		color: #d6f5ff;
	}

	.cta {
		margin-top: 2.5rem;
		text-align: center;
		background: rgba(25, 13, 26, 0.9);
		border-radius: 24px;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.cta h3 {
		color: #f7e99a;
		margin-bottom: 0.5rem;
	}

	.cta-btn {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		border-radius: 999px;
		background: #e85d04;
		color: #fff;
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.calendar-panel header {
			flex-direction: column;
			gap: 0.5rem;
		}

		.weeks,
		.weekday-row {
			gap: 0.25rem;
		}

		.day {
			min-height: 70px;
		}
	}
</style>

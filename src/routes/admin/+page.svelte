<script lang="ts">
	import { goto } from '$app/navigation';
	import { SvelteDate, SvelteMap } from 'svelte/reactivity';

	let { data, form } = $props();

	const todayIso = data.today.slice(0, 10);
	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	let selectedDate = $state(data.today.slice(0, 10));
	let banDate = $state(todayIso);

	const referenceDate = $derived.by(() => new SvelteDate(`${data.referenceMonthParam}-01T00:00:00`));

const participantsMap = $derived.by(() => {
	const map = new SvelteMap<string, string>();
	for (const entry of data.participants ?? []) {
		map.set(entry.date, entry.name);
	}
	return map;
});

type Ban = {
	winnerName: string | null;
	banReason: string | null;
	bannedPersonName: string | null;
	bannedBy: string | null;
};

const bans = $derived.by(() => {
	const map = new SvelteMap<string, Ban>();
	for (const ban of data.bans ?? []) {
		map.set(ban.date, {
			winnerName: ban.winnerName ?? null,
			banReason: ban.banReason ?? null,
			bannedPersonName: ban.bannedPersonName ?? null,
			bannedBy: ban.bannedBy ?? null
		});
	}
	return map;
});

type CalendarDay = { iso: string; label: number; inMonth: boolean; name?: string; banned: boolean };

	const calendarWeeks = $derived.by<CalendarDay[][]>(() => {
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
					name: participantsMap.get(iso),
					banned: bans.has(iso)
				});
				dayOffset += 1;
			}
			weeks.push(row);
		}
		return weeks;
	});

let feedback = $derived(form?.message ?? null);
let feedbackAction = $derived(form?.action ?? null);

let modalContent = $state<{
	title: string;
	description?: string;
	emphasis?: string;
	ban?: Ban;
} | null>(null);

function describeDay(day: CalendarDay) {
	const ban = bans.get(day.iso);
	if (ban) {
		return {
			title: `Ban: ${day.iso}`,
			description: ban.winnerName ? 'Winning pool pick' : 'No winner.',
			emphasis: ban.winnerName ?? undefined,
			ban
		};
	}
	if (day.name) {
		return {
			title: `Claimed: ${day.iso}`,
			description: 'This date is controlled by',
			emphasis: day.name
		};
	}
	return {
		title: `Open date: ${day.iso}`,
		description: day.iso < todayIso ? 'Past date with no pick.' : 'Available for the next season.'
	};
}

function openModal(day: CalendarDay) {
	modalContent = describeDay(day);
}

function applySelectedDate(date: string) {
	selectedDate = date;
	banDate = date;
}

	function handleDayClick(day: CalendarDay) {
		applySelectedDate(day.iso);
		openModal(day);
	}

function handleDateInput(event: Event) {
	const target = event.currentTarget as HTMLInputElement;
	if (target.value) {
		applySelectedDate(target.value);
	}
}
const monthLabel = $derived.by(() =>
	new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(referenceDate)
);

const banMin = $derived.by(() => {
	if (!data.lastWinnerDate) {
		return '';
	}
	const base = new SvelteDate(`${data.lastWinnerDate}T00:00:00`);
	base.setDate(base.getDate() + 1);
	return base.toISOString().slice(0, 10);
});

function changeMonth(offset: number) {
	const target = new SvelteDate(referenceDate);
	target.setMonth(target.getMonth() + offset);
	const param = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
	goto(`/admin?month=${param}`, { invalidateAll: true, noScroll: true, keepFocus: true });
}

function confirmDelete(event: Event) {
	if (!confirm('Delete this participant?')) {
		event.preventDefault();
	}
}

	const selectedName = $derived.by(() => participantsMap.get(selectedDate));
	const canDeleteSelected = $derived.by(() => !!selectedName && selectedDate >= todayIso);

function closeModal() {
	modalContent = null;
}
</script>

<section class="admin-grid">
	<div class="card">
		<h2>Assign a Participant</h2>
		<p>Pick a future date and log exactly one name. You can update it later.</p>
		{#if feedbackAction === 'saveParticipant' && feedback}
			<p class={`feedback ${form?.ok === false ? 'error' : 'success'}`}>{feedback}</p>
		{/if}
		<form method="POST" action="?/saveParticipant">
			<label>
				Date
				<input type="date" name="date" bind:value={selectedDate} min={todayIso} required oninput={handleDateInput} />
			</label>
			<label>
				Participant name
				<input type="text" name="name" value={selectedName ?? ''} placeholder="Sailor Sam" maxlength="80" required />
			</label>
			<button type="submit">Save</button>
		</form>
		{#if canDeleteSelected}
			<form method="POST" action="?/deleteParticipant" onsubmit={confirmDelete} class="inline-form">
				<input type="hidden" name="date" value={selectedDate} />
				<button type="submit" class="ghost">Delete selected pick</button>
			</form>
		{/if}
	</div>

	<div class="card">
		<h2>Declare Ban</h2>
		<p>
			Choose the date a ban actually occurred. It must be after the previous ban and no later than today.
		</p>
		<p class="optional-note">
			<strong>Ban details are optional.</strong> You can submit the ban with only a date, or add any
			of the details below.
		</p>
		<p class="light">
			Last ban:
			{#if data.lastWinnerDate}
				<strong>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${data.lastWinnerDate}T00:00:00`))}</strong>
			{:else}
				<em>None yet</em>
			{/if}
		</p>
		{#if feedbackAction === 'ban' && feedback}
			<p class={`feedback ${form?.ok === false ? 'error' : 'success'}`}>{feedback}</p>
		{/if}
		<form method="POST" action="?/ban">
			<label>
				Ban date
				<input type="date" name="date" bind:value={banDate} min={banMin || undefined} max={todayIso} required />
			</label>
			<fieldset>
				<legend>Optional ban details</legend>
				<label>
					<span>Person banned <small>(optional)</small></span>
					<input
						type="text"
						name="bannedPersonName"
						placeholder="e.g. Calico Pete"
						maxlength="100"
					/>
				</label>
				<label>
					<span>Ban performed by <small>(optional)</small></span>
					<input type="text" name="bannedBy" placeholder="e.g. Captain Jack" maxlength="100" />
				</label>
				<label class="full-width">
					<span>Reason for banning <small>(optional)</small></span>
					<textarea
						name="banReason"
						placeholder="Add context about what happened…"
						maxlength="500"
						rows="3"
					></textarea>
				</label>
			</fieldset>
			<button type="submit" class="danger">BAN!</button>
		</form>
	</div>
</section>

<section class="card">
	<header class="calendar-header">
		<div>
			<h2>Upcoming Picks</h2>
			<p>Use the calendar to review or update claims. Past days are locked.</p>
		</div>
		<div class="month-controls">
			<button type="button" onclick={() => changeMonth(-1)} aria-label="Previous month">⟵</button>
			<span>{monthLabel}</span>
			<button type="button" onclick={() => changeMonth(1)} aria-label="Next month">⟶</button>
		</div>
	</header>
	{#if feedbackAction === 'deleteParticipant' && feedback}
		<p class={`feedback ${form?.ok === false ? 'error' : 'success'}`}>{feedback}</p>
	{/if}
	<div class="calendar">
		<div class="weekday-row">
			{#each weekdays as day (day)}
				<span>{day}</span>
			{/each}
		</div>
		<div class="weeks">
			{#each calendarWeeks as week, index (index)}
				<div class="week">
					{#each week as day (day.iso)}
						{@const isPast = day.iso < todayIso}
						{@const isSelected = day.iso === selectedDate}
						{@const isBanned = day.banned}
						{@const winnerName = bans.get(day.iso)?.winnerName}
						<button
							type="button"
							class={`day ${day.inMonth ? '' : 'muted'} ${day.name ? 'claimed' : ''} ${isPast ? 'past' : ''} ${isSelected ? 'selected' : ''} ${isBanned ? 'banned' : ''}`}
							onclick={() => handleDayClick(day)}
							aria-pressed={isSelected}
							disabled={!day.inMonth}
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
	</div>
	<div class="legend">
		<span><span class="dot open"></span>Open</span>
		<span><span class="dot claimed"></span>Claimed</span>
		<span><span class="dot past"></span>Past</span>
	</div>
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
			{#if modalContent.description}
				<p>{modalContent.description}</p>
			{/if}
			{#if modalContent.emphasis}
				<p class="modal-emphasis">{modalContent.emphasis}</p>
			{/if}
			{#if modalContent.ban && (modalContent.ban.bannedPersonName || modalContent.ban.bannedBy || modalContent.ban.banReason)}
				<dl class="ban-details">
					{#if modalContent.ban.bannedPersonName}
						<div>
							<dt>Person banned</dt>
							<dd>{modalContent.ban.bannedPersonName}</dd>
						</div>
					{/if}
					{#if modalContent.ban.bannedBy}
						<div>
							<dt>Ban performed by</dt>
							<dd>{modalContent.ban.bannedBy}</dd>
						</div>
					{/if}
					{#if modalContent.ban.banReason}
						<div class="reason">
							<dt>Reason</dt>
							<dd>{modalContent.ban.banReason}</dd>
						</div>
					{/if}
				</dl>
			{/if}
		</div>
	</div>
{/if}

<style>
	.admin-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.card {
		background: rgba(7, 9, 20, 0.9);
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1.5rem;
	}

	h2 {
		margin-top: 0;
		color: #f7e99a;
	}

	p {
		color: #a6bbd4;
	}

	.light {
		color: #d7e3f5;
	}

	.optional-note {
		padding: 0.75rem;
		border: 1px solid rgba(111, 211, 255, 0.25);
		border-radius: 12px;
		background: rgba(111, 211, 255, 0.08);
		color: #d6f5ff;
		font-size: 0.9rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1rem;
	}

	.inline-form {
		margin-top: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.9rem;
		color: #cfdcf1;
	}

	input,
	textarea {
		padding: 0.7rem;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(4, 6, 12, 0.85);
		color: #fff;
		font: inherit;
	}

	textarea {
		resize: vertical;
		min-height: 5rem;
	}

	fieldset {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin: 0;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 16px;
	}

	fieldset legend {
		padding: 0 0.4rem;
		color: #f7e99a;
		font-size: 0.85rem;
		font-weight: 700;
	}

	fieldset small {
		color: #8aaed1;
		font-weight: 400;
	}

	fieldset .full-width {
		grid-column: 1 / -1;
	}

	button {
		padding: 0.75rem;
		border: none;
		border-radius: 16px;
		font-weight: 600;
		cursor: pointer;
		background: linear-gradient(120deg, #0d9276, #1dd3b0);
		color: #fff;
	}

	button.danger {
		background: linear-gradient(120deg, #ff5f6d, #c81d77);
	}

	button.ghost {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
	}

	.calendar-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.month-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.month-controls button {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		font-size: 1.1rem;
	}

	.month-controls span {
		color: #f0f4ff;
		font-weight: 600;
	}

	.calendar {
		margin-top: 1.5rem;
	}

	.weekday-row,
	.weeks {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.weekday-row span {
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
		cursor: pointer;
	}

	.day .date {
		font-size: 0.85rem;
		color: #9bb0c7;
	}

	.day strong {
		color: #7fe795;
	}

	.day small {
		color: rgba(255, 255, 255, 0.5);
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
		cursor: not-allowed;
		pointer-events: none;
	}

	.day.past {
		opacity: 0.45;
	}

	.day.selected {
		border-color: rgba(248, 202, 88, 0.95);
		box-shadow: 0 0 12px rgba(248, 202, 88, 0.4);
	}

	.legend {
		margin-top: 1rem;
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		color: #9bb0c7;
	}

	.legend .dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		display: inline-block;
		margin-right: 0.35rem;
	}

	.legend .dot.open {
		background: rgba(255, 255, 255, 0.35);
	}

	.legend .dot.claimed {
		background: #7fe795;
	}

	.legend .dot.past {
		background: rgba(255, 255, 255, 0.15);
	}

	.feedback {
		padding: 0.6rem 0.75rem;
		border-radius: 10px;
		font-size: 0.9rem;
	}

	.feedback.success {
		background: rgba(90, 196, 123, 0.2);
		border: 1px solid rgba(90, 196, 123, 0.5);
		color: #a5ffcb;
	}

	.feedback.error {
		background: rgba(227, 86, 86, 0.15);
		border: 1px solid rgba(227, 86, 86, 0.3);
		color: #ffc9c9;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 20;
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

	.modal-card .modal-emphasis {
		margin-top: 0.35rem;
		color: #7fe795;
		font-weight: 700;
	}

	.ban-details {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin: 1.25rem 0 0;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
	}

	.ban-details div {
		min-width: 0;
	}

	.ban-details .reason {
		grid-column: 1 / -1;
	}

	.ban-details dt {
		color: #8aaed1;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.ban-details dd {
		margin: 0.25rem 0 0;
		color: #f0f4ff;
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}

	@media (max-width: 768px) {
		.month-controls {
			width: 100%;
			justify-content: center;
		}

		.day {
			min-height: 70px;
		}
	}

	@media (max-width: 420px) {
		fieldset,
		.ban-details {
			grid-template-columns: 1fr;
		}

		fieldset .full-width,
		.ban-details .reason {
			grid-column: auto;
		}
	}
</style>

import { startOfMonth, endOfMonth } from 'date-fns';
import type { PageServerLoad } from './$types';
import { getLatestWinner, listParticipantsBetween, listWinnersBetween } from '$lib/server/pool';

export const load: PageServerLoad = async ({ url }) => {
	const monthParam = url.searchParams.get('month');
	let reference = new Date();
	if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
		reference = new Date(`${monthParam}-01T00:00:00`);
	}

	const from = startOfMonth(reference);
	const to = endOfMonth(reference);
	const [participants, bans, latestBan] = await Promise.all([
		listParticipantsBetween(from, to),
		listWinnersBetween(from, to),
		getLatestWinner()
	]);

	return {
		month: {
			year: from.getFullYear(),
			month: from.getMonth() + 1
		},
		participants: participants.map((participant) => ({
			date: participant.date.toISOString(),
			name: participant.name
		})),
		referenceMonthParam: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
		today: new Date().toISOString(),
		latestBanDate: latestBan ? latestBan.date.toISOString().slice(0, 10) : null,
		bans: bans.map((ban) => ({
			date: ban.date.toISOString().slice(0, 10),
			winnerName: ban.winnerName ?? null,
			banReason: ban.banReason ?? null,
			bannedPersonName: ban.bannedPersonName ?? null,
			bannedBy: ban.bannedBy ?? null
		}))
	};
};

import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	addWinner,
	clearParticipantsAfter,
	deleteParticipant,
	getLatestWinner,
	getParticipantByDate,
	listParticipantsBetween,
	listWinnersBetween,
	parseDateOnly,
	upsertParticipant,
	normalizeDate
} from '$lib/server/pool';
import { startOfMonth, endOfMonth } from 'date-fns';

const participantSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	name: z.string().min(2).max(80)
});

const deleteSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const optionalText = (max: number) =>
	z.preprocess(
		(value) => {
			const trimmed = typeof value === 'string' ? value.trim() : '';
			return trimmed || undefined;
		},
		z.string().max(max).optional()
	);

const banSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	banReason: optionalText(500),
	bannedPersonName: optionalText(100),
	bannedBy: optionalText(100)
});

const monthRegex = /^\d{4}-\d{2}$/;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/admin/login');
	}

	const today = normalizeDate(new Date());
	const monthParam = url.searchParams.get('month');
	let reference = startOfMonth(today);
	if (monthParam && monthRegex.test(monthParam)) {
		reference = startOfMonth(new Date(`${monthParam}-01T00:00:00`));
	}

	const monthStart = startOfMonth(reference);
	const monthEnd = endOfMonth(reference);

	const [monthParticipants, monthBans, latestWinner] = await Promise.all([
		listParticipantsBetween(monthStart, monthEnd),
		listWinnersBetween(monthStart, monthEnd),
		getLatestWinner()
	]);

	return {
		today: today.toISOString(),
		participants: monthParticipants.map((participant) => ({
			date: participant.date.toISOString().slice(0, 10),
			name: participant.name
		})),
		lastWinnerDate: latestWinner ? latestWinner.date.toISOString().slice(0, 10) : null,
		referenceMonthParam: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
		bans: monthBans.map((ban) => ({
			date: ban.date.toISOString().slice(0, 10),
			winnerName: ban.winnerName ?? null,
			banReason: ban.banReason ?? null,
			bannedPersonName: ban.bannedPersonName ?? null,
			bannedBy: ban.bannedBy ?? null
		}))
	};
};

export const actions: Actions = {
	saveParticipant: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/admin/login');
		}
		const form = await request.formData();
		const parsed = participantSchema.safeParse({
			date: form.get('date'),
			name: form.get('name')?.toString().trim()
		});
		if (!parsed.success) {
			return fail(400, {
				action: 'saveParticipant',
				message: 'Provide a valid date and participant name.',
				ok: false
			});
		}
		const targetDate = parseDateOnly(parsed.data.date);
		const today = normalizeDate(new Date());
		if (targetDate < today) {
			return fail(400, {
				action: 'saveParticipant',
				message: 'Cannot modify past dates.',
				ok: false
			});
		}
		await upsertParticipant(targetDate, parsed.data.name);
		return { action: 'saveParticipant', message: 'Participant saved.', ok: true };
	},
	deleteParticipant: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/admin/login');
		}
		const form = await request.formData();
		const parsed = deleteSchema.safeParse({ date: form.get('date') });
		if (!parsed.success) {
			return fail(400, { action: 'deleteParticipant', message: 'Invalid date.', ok: false });
		}
		const targetDate = parseDateOnly(parsed.data.date);
		const today = normalizeDate(new Date());
		if (targetDate < today) {
			return fail(400, {
				action: 'deleteParticipant',
				message: 'Cannot modify past dates.',
				ok: false
			});
		}
		await deleteParticipant(targetDate);
		return { action: 'deleteParticipant', message: 'Entry removed.', ok: true };
	},
	ban: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/admin/login');
		}
		const form = await request.formData();
		const parsed = banSchema.safeParse({
			date: form.get('date'),
			banReason: form.get('banReason'),
			bannedPersonName: form.get('bannedPersonName'),
			bannedBy: form.get('bannedBy')
		});
		if (!parsed.success) {
			return fail(400, {
				action: 'ban',
				message: 'Check the ban date and optional details, then try again.',
				ok: false
			});
		}
		const targetDate = parseDateOnly(parsed.data.date);
		const today = normalizeDate(new Date());
		if (targetDate > today) {
			return fail(400, {
				action: 'ban',
				message: 'Cannot declare a ban in the future.',
				ok: false
			});
		}
		const latestWinner = await getLatestWinner();
		if (latestWinner && targetDate <= latestWinner.date) {
			return fail(400, {
				action: 'ban',
				message: 'Ban date must be after the previous ban.',
				ok: false
			});
		}
		const participant = await getParticipantByDate(targetDate);
		await addWinner(targetDate, participant?.name ?? null, {
			banReason: parsed.data.banReason,
			bannedPersonName: parsed.data.bannedPersonName,
			bannedBy: parsed.data.bannedBy
		});
		await clearParticipantsAfter(targetDate);
		return { action: 'ban', message: 'Ban recorded.', ok: true };
	}
};

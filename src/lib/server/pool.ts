import { getDb } from './db';
import { collectionName } from './collections';

export type Participant = {
	date: Date;
	name: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Winner = {
	date: Date;
	winnerName?: string | null;
	banReason?: string | null;
	bannedPersonName?: string | null;
	bannedBy?: string | null;
	createdAt: Date;
};

export type BanDetails = Pick<Winner, 'banReason' | 'bannedPersonName' | 'bannedBy'>;

let indexPromise: Promise<void> | null = null;

export function normalizeDate(date: Date) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function ensureIndexes() {
	if (!indexPromise) {
		indexPromise = (async () => {
			const db = await getDb();
			await Promise.all([
				db.collection<Participant>(collectionName('participants')).createIndex(
					{ date: 1 },
					{ unique: true }
				),
				db.collection<Winner>(collectionName('winners')).createIndex({ date: -1 })
			]);
		})();
	}
	return indexPromise;
}

async function participantsCollection() {
	await ensureIndexes();
	const db = await getDb();
	return db.collection<Participant>(collectionName('participants'));
}

async function winnersCollection() {
	await ensureIndexes();
	const db = await getDb();
	return db.collection<Winner>(collectionName('winners'));
}

export function toISODate(date: Date) {
	return normalizeDate(date).toISOString().slice(0, 10);
}

export function parseDateOnly(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) {
		throw new Error('Invalid date');
	}
	const [, year, month, day] = match;
	return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

export async function upsertParticipant(date: Date, name: string) {
	const collection = await participantsCollection();
	const normalized = normalizeDate(date);
	const now = new Date();
	await collection.updateOne(
		{ date: normalized },
		{ $set: { name, updatedAt: now }, $setOnInsert: { createdAt: now } },
		{ upsert: true }
	);
}

export async function deleteParticipant(date: Date) {
	const collection = await participantsCollection();
	const normalized = normalizeDate(date);
	await collection.deleteOne({ date: normalized });
}

export async function getParticipantByDate(date: Date) {
	const collection = await participantsCollection();
	return collection.findOne({ date: normalizeDate(date) });
}

export async function listParticipantsBetween(start: Date, end: Date) {
	const collection = await participantsCollection();
	return collection
		.find({ date: { $gte: normalizeDate(start), $lte: normalizeDate(end) } })
		.sort({ date: 1 })
		.toArray();
}

export async function clearParticipantsAfter(date: Date) {
	const collection = await participantsCollection();
	await collection.deleteMany({ date: { $gt: normalizeDate(date) } });
}

export async function addWinner(
	date: Date,
	winnerName?: string | null,
	details: BanDetails = {}
) {
	const collection = await winnersCollection();
	const normalized = normalizeDate(date);
	const doc: Winner = {
		date: normalized,
		winnerName: winnerName ?? null,
		banReason: details.banReason ?? null,
		bannedPersonName: details.bannedPersonName ?? null,
		bannedBy: details.bannedBy ?? null,
		createdAt: new Date()
	};
	await collection.insertOne(doc);
	return doc;
}

export async function getLatestWinner() {
	const collection = await winnersCollection();
	return collection.find().sort({ date: -1 }).limit(1).next();
}

export type WinnerSort = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

export async function listWinnersBetween(start: Date, end: Date) {
	const collection = await winnersCollection();
	return collection
		.find({ date: { $gte: normalizeDate(start), $lte: normalizeDate(end) } })
		.sort({ date: 1 })
		.toArray();
}

export async function listWinners(options: { skip: number; limit: number; sort: WinnerSort }) {
	const collection = await winnersCollection();
	const sortMap: Record<WinnerSort, Record<string, 1 | -1>> = {
		date_desc: { date: -1 },
		date_asc: { date: 1 },
		name_asc: { winnerName: 1, date: -1 },
		name_desc: { winnerName: -1, date: -1 }
	};
	return collection.find().sort(sortMap[options.sort]).skip(options.skip).limit(options.limit).toArray();
}

export async function countWinners() {
	const collection = await winnersCollection();
	return collection.countDocuments();
}

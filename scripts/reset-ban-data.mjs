#!/usr/bin/env node
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
	console.error('Missing MONGODB_URI environment variable.');
	process.exit(1);
}

const envPrefix = process.env.NODE_ENV === 'production' ? 'prod_' : 'dev_';

const client = new MongoClient(uri);

const randomNames = [
	'Scarlet Sam',
	'Marina Gale',
	'Olive Drifter',
	'Coral Finch',
	'Rory Flint',
	'Ginny North',
	'Calico Pete',
	'Lantern Lex',
	'Betsy Reef',
	'Aiden Storm',
	'Pearl Banner',
	'Juniper Cove',
	'Nolan Riggs',
	'Mira Tide'
];

function pickRandomName() {
	return randomNames[Math.floor(Math.random() * randomNames.length)];
}

function startOfUTC(date) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function run() {
	await client.connect();
	const db = client.db();
	const participants = db.collection(`${envPrefix}participants`);
	const winners = db.collection(`${envPrefix}winners`);

	console.log('Clearing winners/bans…');
	await winners.deleteMany({});

	const today = startOfUTC(new Date());
	const end = new Date(today);
	const start = new Date(today);
	start.setUTCDate(start.getUTCDate() - 14);

	console.log(
		`Seeding participants from ${start.toISOString().slice(0, 10)} through ${new Date(
			end.getTime() - 86400000
		)
			.toISOString()
			.slice(0, 10)}`
	);

	await participants.deleteMany({ date: { $gte: start, $lt: end } });

	const docs = [];
	for (let offset = 14; offset >= 1; offset -= 1) {
		const date = new Date(end);
		date.setUTCDate(end.getUTCDate() - offset);
		const normalized = startOfUTC(date);
		const now = new Date();
		docs.push({
			date: normalized,
			name: pickRandomName(),
			createdAt: now,
			updatedAt: now
		});
	}

	if (docs.length) {
		await participants.insertMany(docs);
	}

	console.log('Seeding complete.');
}

run()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => client.close());

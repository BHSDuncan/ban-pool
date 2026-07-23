#!/usr/bin/env node
import { MongoClient } from 'mongodb';

if (!process.argv.includes('--confirm-production')) {
	console.error('Refusing to run without --confirm-production.');
	process.exit(1);
}

const uri = process.env.MONGODB_URI_PROD ?? process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE_PROD ?? process.env.MONGODB_DATABASE;

if (!uri || !dbName) {
	console.error(
		'Missing production database settings. Set MONGODB_URI_PROD (or MONGODB_URI) and MONGODB_DATABASE_PROD (or MONGODB_DATABASE).'
	);
	process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
	await client.connect();
	const winners = client.db(dbName).collection('prod_winners');

	const result = await winners.updateMany(
		{
			$or: [
				{ banReason: { $exists: false } },
				{ bannedPersonName: { $exists: false } },
				{ bannedBy: { $exists: false } }
			]
		},
		[
			{
				$set: {
					banReason: { $ifNull: ['$banReason', null] },
					bannedPersonName: { $ifNull: ['$bannedPersonName', null] },
					bannedBy: { $ifNull: ['$bannedBy', null] }
				}
			}
		]
	);

	console.log(
		`Production ban-details migration complete. Matched ${result.matchedCount} legacy record(s); updated ${result.modifiedCount}.`
	);
}

run()
	.catch((error) => {
		console.error('Production ban-details migration failed:', error);
		process.exitCode = 1;
	})
	.finally(() => client.close());

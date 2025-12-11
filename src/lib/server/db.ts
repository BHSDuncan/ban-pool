import { MongoClient } from 'mongodb';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

function selectUri() {
	if (dev) {
		return env.MONGODB_URI_DEV ?? env.MONGODB_URI;
	}
	return env.MONGODB_URI_PROD ?? env.MONGODB_URI;
}

const uri = selectUri();
const dbName = dev ? env.MONGODB_DATABASE_DEV ?? env.MONGODB_DATABASE : env.MONGODB_DATABASE_PROD ?? env.MONGODB_DATABASE;

if (!uri) {
	const envName = dev ? 'MONGODB_URI_DEV (or MONGODB_URI)' : 'MONGODB_URI_PROD (or MONGODB_URI)';
	throw new Error(`Missing ${envName} environment variable`);
}

if (!dbName) {
	const envName = dev
		? 'MONGODB_DATABASE_DEV (or MONGODB_DATABASE)'
		: 'MONGODB_DATABASE_PROD (or MONGODB_DATABASE)';
	throw new Error(`Missing ${envName} environment variable`);
}

type GlobalMongo = {
	clientPromiseDev?: Promise<MongoClient>;
	clientPromiseProd?: Promise<MongoClient>;
};

const globalMongo = globalThis as unknown as GlobalMongo;
type ClientKey = keyof GlobalMongo;
const clientKey: ClientKey = dev ? 'clientPromiseDev' : 'clientPromiseProd';

if (!globalMongo[clientKey]) {
	const client = new MongoClient(uri);
	globalMongo[clientKey] = client.connect();
}

export const mongoClientPromise = globalMongo[clientKey]!;

export async function getDb() {
	const client = await mongoClientPromise;
	return client.db(dbName);
}

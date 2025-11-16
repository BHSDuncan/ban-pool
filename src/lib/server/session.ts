import { randomBytes } from 'node:crypto';
import type { Collection } from 'mongodb';
import { getDb } from './db';
import { collectionName } from './collections';

const SESSION_DURATION_MS = 30 * 60 * 1000;
export const SESSION_COOKIE_NAME = 'cjb_session';

type SessionDoc = {
	token: string;
	username: string;
	createdAt: Date;
	expiresAt: Date;
};

let sessionIndexPromise: Promise<void> | null = null;

async function ensureSessionIndexes(collection: Collection<SessionDoc>) {
	if (!sessionIndexPromise) {
		sessionIndexPromise = collection
			.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
			.then(() => undefined);
	}
	return sessionIndexPromise;
}

async function sessionsCollection() {
	const db = await getDb();
	const collection = db.collection<SessionDoc>(collectionName('sessions'));
	await ensureSessionIndexes(collection);
	return collection;
}

export async function createSession(username: string) {
	const collection = await sessionsCollection();
	const now = new Date();
	const token = randomBytes(32).toString('hex');
	const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
	await collection.insertOne({ token, username, createdAt: now, expiresAt });
	return { token, expiresAt };
}

export async function findSession(token: string) {
	const collection = await sessionsCollection();
	const session = await collection.findOne({ token });
	if (!session) {
		return null;
	}
	if (session.expiresAt <= new Date()) {
		await collection.deleteOne({ token });
		return null;
	}
	return session;
}

export async function deleteSession(token: string) {
	const collection = await sessionsCollection();
	await collection.deleteOne({ token });
}

export function sessionMaxAgeSeconds() {
	return Math.floor(SESSION_DURATION_MS / 1000);
}

import { env } from '$env/dynamic/private';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const FALLBACK_USERNAME = 'captain-jack';
const FALLBACK_PASSWORD = 'ban-parrot';

const configuredUsername = env.ADMIN_USERNAME ?? FALLBACK_USERNAME;
const configuredPlainPassword = env.ADMIN_PASSWORD ?? FALLBACK_PASSWORD;
const configuredHash = env.ADMIN_PASSWORD_HASH;

function verifyHash(password: string, stored: string) {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) {
		throw new Error('ADMIN_PASSWORD_HASH must be in the format <salt>:<hash>');
	}
	const derived = scryptSync(password, salt, 64);
	const storedBuffer = Buffer.from(hash, 'hex');
	if (storedBuffer.length !== derived.length) {
		return false;
	}
	return timingSafeEqual(derived, storedBuffer);
}

function verifyPlain(password: string) {
	const left = Buffer.from(password);
	const right = Buffer.from(configuredPlainPassword);
	if (left.length !== right.length) {
		return false;
	}
	return timingSafeEqual(left, right);
}

export function verifyAdminCredentials(username: string, password: string) {
	if (username !== configuredUsername) {
		return false;
	}
	if (configuredHash) {
		return verifyHash(password, configuredHash);
	}
	return verifyPlain(password);
}

export function getAdminUsername() {
	return configuredUsername;
}

export function createPasswordHash(password: string) {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

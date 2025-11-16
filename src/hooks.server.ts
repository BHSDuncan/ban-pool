import type { Handle } from '@sveltejs/kit';
import { findSession, SESSION_COOKIE_NAME } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(SESSION_COOKIE_NAME);
	if (sessionId) {
		const session = await findSession(sessionId);
		if (session) {
			event.locals.user = {
				username: session.username,
				expiresAt: session.expiresAt
			};
		} else {
			event.locals.user = null;
			event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};

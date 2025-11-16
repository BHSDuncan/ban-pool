import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { verifyAdminCredentials } from '$lib/server/auth';
import { createSession, SESSION_COOKIE_NAME, sessionMaxAgeSeconds } from '$lib/server/session';

const schema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required')
});

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/admin');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const parsed = schema.safeParse({
			username: formData.get('username'),
			password: formData.get('password')
		});

		if (!parsed.success) {
			return fail(400, { message: 'Username and password are required.' });
		}

		const { username, password } = parsed.data;
		if (!verifyAdminCredentials(username, password)) {
			return fail(401, { message: 'Invalid credentials' });
		}

		const session = await createSession(username);
		cookies.set(SESSION_COOKIE_NAME, session.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: sessionMaxAgeSeconds(),
			secure: process.env.NODE_ENV === 'production'
		});

		throw redirect(303, '/admin');
	}
};

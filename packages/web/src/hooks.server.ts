import { redirect, type Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

const handleAuth: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(auth.sessionCookieName);
	if (event.url.pathname !== '/' && cookie !== auth.sessionCookieValue) {
		throw redirect(308, '/');
	}
	return resolve(event);
};

export const handle: Handle = handleAuth;

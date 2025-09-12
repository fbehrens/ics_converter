import type { RequestEvent } from '@sveltejs/kit';
export const sessionCookieName = 'ics-auth-session';
export const sessionCookieValue = 'h7lsSTFskF8Wj7VwpTBYGx3f_asfioj7893hsfd';
export const sessionPassword = 'rhytmuswelten';

export function setSessionTokenCookie(event: RequestEvent) {
	event.cookies.set(sessionCookieName, sessionCookieValue, {
		path: '/'
	});
}

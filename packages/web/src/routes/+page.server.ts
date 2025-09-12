import { fail, redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/demo/lucia');
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const password = formData.get('password');
		if (password !== auth.sessionPassword) {
			return fail(400, { message: 'Invalid password' });
		}
		auth.setSessionTokenCookie(event);
		return redirect(302, '/app');
	}
};

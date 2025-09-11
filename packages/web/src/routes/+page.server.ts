import type { PageServerLoad } from './$types';
import { FOO } from '$env/static/private';

export const load = (async () => {
	return { FOO };
}) satisfies PageServerLoad;

import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
	return {
		canonical: `https://pwn4g3.pages.dev${url.pathname}`
	};
};
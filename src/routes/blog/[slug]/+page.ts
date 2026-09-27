import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { posts, getPost } from '$lib/data/posts';

export const prerender = true;

export function entries() {
	return posts.map((post) => ({ slug: post.slug }));
}

export const load: PageLoad = ({ params }) => {
	const post = getPost(params.slug);
	if (!post) error(404, 'Post not found');
	const i = posts.findIndex((p) => p.slug === params.slug);
	return {
		post,
		prev: i > 0 ? { slug: posts[i - 1].slug, title: posts[i - 1].title } : null,
		next: i < posts.length - 1 ? { slug: posts[i + 1].slug, title: posts[i + 1].title } : null
	};
};

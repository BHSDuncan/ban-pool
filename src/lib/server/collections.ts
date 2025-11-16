import { dev } from '$app/environment';

const prefix = dev ? 'dev_' : 'prod_';

export function collectionName(base: string) {
	return `${prefix}${base}`;
}

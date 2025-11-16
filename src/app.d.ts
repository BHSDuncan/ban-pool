// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: {
				username: string;
				expiresAt: Date;
			} | null;
		}

		interface PageData {
			user?: {
				username: string;
				expiresAt: string;
			} | null;
		}
	}
}

export {};

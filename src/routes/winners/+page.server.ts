import type { PageServerLoad } from './$types';
import { countWinners, listWinners, type WinnerSort } from '$lib/server/pool';

const PAGE_SIZES = [10, 20, 50] as const;
const SORT_OPTIONS: WinnerSort[] = ['date_desc', 'date_asc', 'name_asc', 'name_desc'];

export const load: PageServerLoad = async ({ url }) => {
	const pageParam = Number(url.searchParams.get('page') ?? '1');
	const pageSizeParam = Number(url.searchParams.get('pageSize') ?? '10');
	const sortParam = url.searchParams.get('sort') as WinnerSort | null;

	const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
	const pageSize = PAGE_SIZES.includes(pageSizeParam as (typeof PAGE_SIZES)[number])
		? pageSizeParam
		: PAGE_SIZES[0];
	const sort = SORT_OPTIONS.includes(sortParam ?? 'date_desc') ? sortParam ?? 'date_desc' : 'date_desc';

	const skip = (page - 1) * pageSize;
	const [winners, total] = await Promise.all([
		listWinners({ skip, limit: pageSize, sort }),
		countWinners()
	]);

	return {
		winners: winners.map((winner) => ({
			date: winner.date.toISOString(),
			winnerName: winner.winnerName ?? null
		})),
		page,
		pageSize,
		total,
		sort,
		pageSizes: PAGE_SIZES
	};
};

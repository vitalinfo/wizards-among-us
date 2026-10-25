// How many rows a cabinet list shows per page — the «Записів на сторінці»
// picker (Figma 139:4543), shared by «Мої заявки», «Мої підопічні» and «Мої
// Чарівники».
//
// The size is in the url, so it is a value a visitor can type. Only these are
// accepted: anything else falls back to the default rather than reaching the
// database as a LIMIT — `?per=100000` must not turn a page into the whole list.

export const PAGE_SIZES = [5, 10, 20] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 10;

export function parsePageSize(value: string | undefined): PageSize {
  const size = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(size)
    ? (size as PageSize)
    : DEFAULT_PAGE_SIZE;
}

// Never zero, so «page 1 of 0» cannot be rendered.
export function pageCount(total: number, per: PageSize): number {
  return Math.max(1, Math.ceil(total / per));
}

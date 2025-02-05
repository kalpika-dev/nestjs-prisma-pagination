import { PaginatorTypes } from "../../index";

export const searchPaginator = (
  defaultOptions: PaginatorTypes.SearchPaginateOptions
): PaginatorTypes.SearchPaginateFunction => {
  return async <T>(
      prisma: any, 
      modelName: string, 
      options?: PaginatorTypes.SearchPaginateOptions
  ) => {
      const page = Number(options?.page || defaultOptions.page || 1);
      const perPage = Number(options?.perPage || defaultOptions.perPage || 10);
      const skip = (page - 1) * perPage;
      const searchValue = options?.searchValue?.trim() || '';
      const searchColumns = options?.searchColumns || [];

      let data: T & { row_count: number }[];

      if (searchValue && searchColumns.length > 0) {
          const formattedSearchValue = searchValue
              .split(' ')
              .filter(word => word.length > 0)
              .map(word => `${word}:*`)
              .join(' & ');

          const columnsQuery = searchColumns
              .map((c: string) => `coalesce("${c}"::text, '')`)
              .join(" || ' ' || ");

          data = await prisma.$queryRawUnsafe(`
              SELECT *,
              (SELECT COUNT(*) FROM "${modelName}"
                  WHERE to_tsvector('english',
                  ${columnsQuery}
                  ) @@ to_tsquery('english', '${formattedSearchValue}')) AS row_count
              FROM "${modelName}"
              WHERE to_tsvector('english',
                  ${columnsQuery}
                  ) @@ to_tsquery('english', '${formattedSearchValue}')
              LIMIT ${perPage}
              OFFSET ${skip};
          `);
      } else {
          data = await prisma.$queryRawUnsafe(`
              SELECT *,
              (SELECT COUNT(*) FROM "${modelName}") as row_count
              FROM "${modelName}"
              LIMIT ${perPage}
              OFFSET ${skip};
          `);
      }

      const total = Number(data[0]?.row_count || 0);
      const lastPage = Math.ceil(total / perPage);

      return {
          data, // Return the data as is, including row_count
          meta: {
              total,
              lastPage,
              currentPage: page,
              perPage,
              prev: page > 1 ? page - 1 : null,
              next: page < lastPage ? page + 1 : null,
          },
      };
  };
};
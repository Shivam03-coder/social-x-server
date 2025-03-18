import { db } from "@src/db";

// interface PaginateParams<
//   ModelDelegate extends { findMany: Function; count: Function },
//   WhereInput,
//   OrderByInput
// > {
//   model: ModelDelegate;
//   page?: number;
//   limit?: number;
//   where?: WhereInput;
//   orderBy?: OrderByInput;
// }

interface PaginateParams<
  ModelDelegate extends { findMany: Function; count: Function },
  WhereInput,
  OrderByInput
> {
  model: ModelDelegate;
  page?: number;
  limit?: number;
  where?: WhereInput;
  orderBy?: OrderByInput;
}

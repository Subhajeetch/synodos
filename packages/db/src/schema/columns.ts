import { customType } from "drizzle-orm/pg-core";

/** Postgres bytea <-> Node Buffer. Used for Yjs binary state. */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

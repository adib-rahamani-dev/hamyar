import type { Pool } from "pg";
export function migrate(pool: Pool): Promise<void>;

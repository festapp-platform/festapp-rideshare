import { Client } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const DB_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: tsx run-sql.ts <file1.sql> [file2.sql ...]");
    process.exit(1);
  }

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    for (const file of files) {
      const path = resolve(process.cwd(), file);
      const sql = readFileSync(path, "utf-8");
      console.log(`Executing ${file}...`);
      await client.query(sql);
      console.log(`  Done.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

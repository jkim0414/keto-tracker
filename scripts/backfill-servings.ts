import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load env from .env.local first, then .env.production with override option.
config({ path: ".env.local" });

const url =
  process.argv[2] === "prod"
    ? process.env.PROD_DATABASE_URL_UNPOOLED
    : process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
  console.error("No DB URL. Usage: tsx scripts/backfill-servings.ts [prod]");
  console.error("Set PROD_DATABASE_URL_UNPOOLED for prod target.");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  const before = await sql`
    SELECT COUNT(*)::int AS missing FROM food_entries
    WHERE net_carbs_per_serving_g IS NULL
  `;
  console.log(`Rows needing backfill: ${before[0].missing}`);

  if (before[0].missing === 0) {
    console.log("Nothing to do.");
    return;
  }

  await sql`
    UPDATE food_entries
    SET net_carbs_per_serving_g = net_carbs_g,
        servings = '1'
    WHERE net_carbs_per_serving_g IS NULL
  `;

  const after = await sql`
    SELECT COUNT(*)::int AS missing FROM food_entries
    WHERE net_carbs_per_serving_g IS NULL
  `;
  console.log(`Backfill complete. Remaining unbackfilled: ${after[0].missing}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

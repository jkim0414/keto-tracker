import {
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  integer,
  date,
} from "drizzle-orm/pg-core";

export const foodEntries = pgTable("food_entries", {
  id: serial("id").primaryKey(),
  eatenAt: timestamp("eaten_at", { withTimezone: true }).notNull().defaultNow(),
  localDate: date("local_date").notNull(),
  name: text("name").notNull(),
  servingDescription: text("serving_description"),
  servingGrams: numeric("serving_grams"),
  // Servings is the editable quantity (e.g., "1.5 of X"). Per-serving carbs is
  // the immutable "what one serving costs" value. Total (net_carbs_g) =
  // servings × net_carbs_per_serving_g, denormalized for fast SUM queries.
  servings: numeric("servings").notNull().default("1"),
  netCarbsPerServingG: numeric("net_carbs_per_serving_g"),
  netCarbsG: numeric("net_carbs_g").notNull(),
  source: text("source").notNull(),
  rawInput: text("raw_input"),
  barcode: text("barcode"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weightLogs = pgTable("weight_logs", {
  id: serial("id").primaryKey(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  localDate: date("local_date").notNull(),
  weightKg: numeric("weight_kg").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  dailyNetCarbGoal: numeric("daily_net_carb_goal").notNull().default("20"),
  weightUnit: text("weight_unit").notNull().default("lb"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FoodEntry = typeof foodEntries.$inferSelect;
export type NewFoodEntry = typeof foodEntries.$inferInsert;
export type WeightLog = typeof weightLogs.$inferSelect;
export type NewWeightLog = typeof weightLogs.$inferInsert;
export type Settings = typeof settings.$inferSelect;

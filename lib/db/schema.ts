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

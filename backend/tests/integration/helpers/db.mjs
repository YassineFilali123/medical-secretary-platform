/**
 * Direct database access for the integration suite.
 *
 * Used for two things only:
 *   1. finding an existing administrator to create fixtures with, and
 *   2. asserting that what the API reported actually reached the tables.
 *
 * The second is the point of an integration test: an endpoint that returns
 * `success: true` without writing a row would pass an API-only check.
 *
 * Shells out to the mysql client rather than adding a driver dependency —
 * the project has no database package, and this keeps it that way.
 */
import { execFileSync } from "node:child_process";

const MYSQL =
  process.env.MYSQL_BIN ?? "C:\\xampp\\mysql\\bin\\mysql.exe";
const DATABASE = process.env.DB_NAME ?? "medisecretary";
const DB_USER = process.env.DB_USER ?? "root";

function run(sql, { raw = false } = {}) {
  const args = ["-u", DB_USER, DATABASE, "-e", sql];
  if (raw) args.splice(2, 0, "-N", "--batch");

  try {
    return execFileSync(MYSQL, args, { encoding: "utf8" });
  } catch (err) {
    throw new Error(
      `Database query failed.\n  SQL: ${sql}\n  ${err?.stderr ?? err?.message ?? err}`,
    );
  }
}

/** Runs a statement, returns nothing. */
export function exec(sql) {
  run(sql);
}

/** First column of the first row, as a string, or null. */
export function scalar(sql) {
  const out = run(sql, { raw: true }).trim();
  return out === "" ? null : out.split("\n")[0].split("\t")[0];
}

/** Rows as arrays of column strings. */
export function rows(sql) {
  const out = run(sql, { raw: true }).trim();
  return out === "" ? [] : out.split("\n").map((line) => line.split("\t"));
}

export function count(sql) {
  return Number(scalar(sql) ?? 0);
}

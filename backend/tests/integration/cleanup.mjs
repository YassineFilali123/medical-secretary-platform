/**
 * Removes any fixture rows left behind by an interrupted test run.
 * Deletes only accounts with the itest_ prefix; nothing else is touched.
 * Run this only when no suite is in progress.
 */
import { cleanupAllFixtures, fixtureCount } from "./helpers/fixtures.mjs";

const removed = cleanupAllFixtures();
console.log(`Removed ${removed} fixture account(s). Remaining: ${fixtureCount()}`);

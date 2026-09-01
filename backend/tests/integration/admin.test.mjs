import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { get, post } from "./helpers/api.mjs";
import { count, rows, scalar } from "./helpers/db.mjs";
import {
  adminToken,
  cleanupFixtures,
  createUser,
  FIXTURE_PASSWORD,
  trackUser,
  uniqueEmail,
} from "./helpers/fixtures.mjs";

describe("Admin", () => {
  let admin;
  let patient;
  let doctor;
  let secretary;

  before(async () => {
    admin = adminToken();
    patient = await createUser("patient", "admin");
    doctor = await createUser("doctor", "admin");
    secretary = await createUser("secretary", "admin");
  });

  after(() => cleanupFixtures());

  describe("user CRUD", () => {
    it("creates a user that can then sign in", async () => {
      const email = uniqueEmail("created");
      const { status, body } = await post("/admin/users/create", admin.token, {
        name: "ITEST created user",
        email,
        password: FIXTURE_PASSWORD,
        role: "secretary",
        status: "active",
      });

      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.user.role, "secretary");
      // Created through the API rather than the helper, so register it for cleanup.
      trackUser(body.user.id);

      const stored = rows(`SELECT roles, status FROM user WHERE id = ${Number(body.user.id)}`);
      assert.match(stored[0][0], /ROLE_SECRETARY/);

      const login = await post("/login", null, { email, password: FIXTURE_PASSWORD });
      assert.equal(login.body.success, true, "an admin-created account should be usable");
    });

    it("refuses a duplicate email", async () => {
      const { body } = await post("/admin/users/create", admin.token, {
        name: "ITEST duplicate",
        email: patient.email,
        password: FIXTURE_PASSWORD,
        role: "patient",
      });

      assert.equal(body.success, false);
      assert.match(body.error, /already exists/i);
    });

    it("refuses an invalid email and a short password", async () => {
      const badEmail = await post("/admin/users/create", admin.token, {
        name: "ITEST bad",
        email: "not-an-email",
        password: FIXTURE_PASSWORD,
        role: "patient",
      });
      assert.equal(badEmail.body.success, false);

      const shortPassword = await post("/admin/users/create", admin.token, {
        name: "ITEST bad",
        email: uniqueEmail("short"),
        password: "123",
        role: "patient",
      });
      assert.equal(shortPassword.body.success, false);
    });

    it("updates a user's name", async () => {
      const target = await createUser("patient", "rename");
      const { body } = await post("/admin/users/update", admin.token, {
        id: target.id,
        name: "ITEST renamed",
      });

      assert.equal(body.success, true);
      assert.equal(scalar(`SELECT name FROM user WHERE id = ${target.id}`), "ITEST renamed");
    });

    it("soft-deletes a user, keeping the row and blocking sign-in", async () => {
      const target = await createUser("patient", "delete");

      const { body } = await post("/admin/users/delete", admin.token, { id: target.id });
      assert.equal(body.success, true);

      // The row survives — medical history hangs off it via cascading keys.
      const row = rows(
        `SELECT deleted_at IS NOT NULL, status FROM user WHERE id = ${target.id}`,
      );
      assert.equal(row.length, 1, "a deleted user must remain in the table");
      assert.equal(row[0][0], "1", "deleted_at should be set");
      assert.equal(row[0][1], "inactive");

      const login = await post("/login", null, {
        email: target.email,
        password: FIXTURE_PASSWORD,
      });
      assert.equal(login.body.success, false, "a deleted user must not sign in");

      const listed = await get(`/admin/users?q=${encodeURIComponent(target.email)}`, admin.token);
      assert.equal(listed.body.total, 0, "a deleted user must leave the admin list");
    });

    it("stops an administrator deleting their own account", async () => {
      const { status, body } = await post("/admin/users/delete", admin.token, { id: admin.id });

      assert.equal(status, 403);
      assert.match(body.error, /your own account/i);
      assert.equal(
        scalar(`SELECT deleted_at IS NULL FROM user WHERE id = ${admin.id}`),
        "1",
        "the administrator must still be active",
      );
    });
  });

  describe("roles", () => {
    it("changes a role and the change takes effect immediately", async () => {
      const target = await createUser("patient", "promote");

      // Before: a patient cannot reach the doctor endpoint.
      const before = await get("/doctor/patients", target.token);
      assert.equal(before.status, 403);

      const { body } = await post("/admin/users/role", admin.token, {
        id: target.id,
        role: "doctor",
      });
      assert.equal(body.success, true);
      assert.equal(body.user.role, "doctor");

      // After: the same token now reaches it, with no re-login.
      const after = await get("/doctor/patients", target.token);
      assert.equal(after.status, 200, "a role change must apply to the API at once");

      assert.match(scalar(`SELECT roles FROM user WHERE id = ${target.id}`), /ROLE_DOCTOR/);
    });

    it("rejects an unknown role", async () => {
      const target = await createUser("patient", "badrole");
      const { body } = await post("/admin/users/role", admin.token, {
        id: target.id,
        role: "superuser",
      });

      assert.equal(body.success, false);
      assert.match(body.error, /must be one of/i);
    });

    it("stops an administrator changing their own role", async () => {
      const { status, body } = await post("/admin/users/role", admin.token, {
        id: admin.id,
        role: "patient",
      });

      assert.equal(status, 403);
      assert.match(body.error, /your own role/i);
      assert.match(scalar(`SELECT roles FROM user WHERE id = ${admin.id}`), /ROLE_ADMIN/);
    });

    it("reports role counts that match the database", async () => {
      const { body } = await get("/admin/roles", admin.token);
      assert.equal(body.success, true);

      for (const role of body.roles) {
        const actual = count(
          `SELECT COUNT(*) FROM user
            WHERE deleted_at IS NULL AND JSON_CONTAINS(roles, '"${role.storedRole}"')`,
        );
        assert.equal(role.total, actual, `${role.key} count should match the database`);
      }
    });
  });

  describe("authorization", () => {
    const adminRoutes = [
      "/admin/users",
      "/admin/roles",
      "/admin/statistics",
      "/admin/ai/settings",
      "/admin/ai/faqs",
      "/admin/ai/scenarios",
      "/ratings/doctors/summary",
    ];

    for (const route of adminRoutes) {
      it(`refuses ${route} to a patient, a doctor and a secretary`, async () => {
        for (const user of [patient, doctor, secretary]) {
          const { status } = await get(route, user.token);
          assert.equal(status, 403, `${route} should be admin-only`);
        }
      });
    }

    it("refuses admin writes to a non-admin", async () => {
      const target = await createUser("patient", "victim");

      const attempt = await post("/admin/users/delete", patient.token, { id: target.id });
      assert.equal(attempt.status, 403);

      assert.equal(
        scalar(`SELECT deleted_at IS NULL FROM user WHERE id = ${target.id}`),
        "1",
        "the refused delete must not have happened",
      );
    });
  });

  describe("ratings and statistics", () => {
    it("returns a doctor rating summary that includes every doctor", async () => {
      const { status, body } = await get("/ratings/doctors/summary", admin.token);

      assert.equal(status, 200);
      assert.equal(body.success, true);

      const doctorsInDb = count(
        `SELECT COUNT(*) FROM user
          WHERE deleted_at IS NULL AND JSON_CONTAINS(roles, '"ROLE_DOCTOR"')`,
      );
      assert.equal(body.doctors.length, doctorsInDb);
      assert.equal(body.summary.doctorCount, doctorsInDb);
    });

    it("validates the rating sort and filter parameters", async () => {
      const badSort = await get("/ratings/doctors/summary?sort=DROP", admin.token);
      assert.equal(badSort.body.success, false);

      const badRating = await get("/ratings/doctors/summary?minRating=9", admin.token);
      assert.equal(badRating.body.success, false);
    });

    it("returns statistics", async () => {
      const { status, body } = await get("/admin/statistics?range=month", admin.token);

      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.ok(body.kpis);
      assert.ok(body.charts);
    });
  });
});

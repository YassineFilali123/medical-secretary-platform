import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { get, post, tokenFor } from "./helpers/api.mjs";
import {
  adminToken,
  cleanupFixtures,
  createUser,
  FIXTURE_PASSWORD,
} from "./helpers/fixtures.mjs";

describe("Authentication", () => {
  let patient;
  let doctor;

  before(async () => {
    patient = await createUser("patient");
    doctor = await createUser("doctor");
  });

  after(() => cleanupFixtures());

  it("logs in with correct credentials and returns the user's role", async () => {
    const { status, body } = await post("/login", null, {
      email: patient.email,
      password: FIXTURE_PASSWORD,
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.user.email, patient.email);
    assert.deepEqual(body.user.roles, ["ROLE_PATIENT"]);
    // Admin-created accounts skip email verification.
    assert.equal(body.user.isVerified, true);
  });

  it("rejects a wrong password without revealing which field was wrong", async () => {
    const { body } = await post("/login", null, {
      email: patient.email,
      password: "definitely-not-the-password",
    });

    assert.equal(body.success, false);
    assert.match(body.error, /invalid email or password/i);
  });

  it("rejects an unknown email with the same message", async () => {
    const { body } = await post("/login", null, {
      email: "itest_nobody_at_all@test.local",
      password: FIXTURE_PASSWORD,
    });

    assert.equal(body.success, false);
    assert.match(body.error, /invalid email or password/i);
  });

  it("rejects a login with missing fields", async () => {
    const { body } = await post("/login", null, { email: patient.email });
    assert.equal(body.success, false);
    assert.match(body.error, /required/i);
  });

  it("refuses a deactivated account, so admin deactivation actually bites", async () => {
    const target = await createUser("patient", "deactivated");
    const { token: admin } = adminToken();

    const change = await post("/admin/users/status", admin, {
      id: target.id,
      status: "inactive",
    });
    assert.equal(change.body.success, true);

    const { status, body } = await post("/login", null, {
      email: target.email,
      password: FIXTURE_PASSWORD,
    });

    assert.equal(status, 403);
    assert.equal(body.success, false);
    assert.match(body.error, /deactivated/i);
  });

  it("refuses administrator self-registration on the public endpoint", async () => {
    const { status, body } = await post("/register", null, {
      name: "ITEST escalation",
      email: `itest_escalation_${Date.now()}@test.local`,
      password: FIXTURE_PASSWORD,
      role: "admin",
    });

    assert.equal(status, 403);
    assert.equal(body.success, false);
    assert.match(body.error, /cannot be self-registered/i);
  });

  describe("role authorization", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const { status, body } = await get("/admin/users", null);
      assert.equal(status, 401);
      assert.equal(body.success, false);
    });

    it("rejects a forged token for a user that does not exist", async () => {
      const { status } = await get("/profile", tokenFor(99999999));
      assert.equal(status, 401);
    });

    it("lets a patient reach a patient endpoint", async () => {
      const { status, body } = await get("/appointments", patient.token);
      assert.equal(status, 200);
      assert.equal(body.success, true);
    });

    it("stops a patient reaching a doctor endpoint", async () => {
      const { status, body } = await get("/doctor/patients", patient.token);
      assert.equal(status, 403);
      assert.equal(body.success, false);
    });

    it("stops a doctor reaching an admin endpoint", async () => {
      const { status, body } = await get("/admin/users", doctor.token);
      assert.equal(status, 403);
      assert.equal(body.success, false);
    });

    it("lets a doctor reach their own doctor endpoint", async () => {
      const { status, body } = await get("/doctor/patients", doctor.token);
      assert.equal(status, 200);
      assert.equal(body.success, true);
    });
  });
});

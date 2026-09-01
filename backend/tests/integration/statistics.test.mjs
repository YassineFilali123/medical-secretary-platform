import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { get } from "./helpers/api.mjs";
import { count } from "./helpers/db.mjs";
import { adminToken, cleanupFixtures, createUser } from "./helpers/fixtures.mjs";

/**
 * The point of these is that the dashboard numbers are derived from the tables,
 * not invented. Each KPI is recomputed with an independent query and compared.
 */
describe("Statistics", () => {
  let admin;
  let patient;

  before(async () => {
    admin = adminToken();
    patient = await createUser("patient", "stats");
  });

  after(() => cleanupFixtures());

  it("requires an administrator", async () => {
    const asPatient = await get("/admin/statistics", patient.token);
    assert.equal(asPatient.status, 403);

    const anonymous = await get("/admin/statistics", null);
    assert.equal(anonymous.status, 401);
  });

  it("validates the range parameters", async () => {
    const badRange = await get("/admin/statistics?range=alltime", admin.token);
    assert.equal(badRange.body.success, false);

    const missingDates = await get("/admin/statistics?range=custom", admin.token);
    assert.equal(missingDates.body.success, false);

    const reversed = await get(
      "/admin/statistics?range=custom&startDate=2026-12-01&endDate=2026-01-01",
      admin.token,
    );
    assert.equal(reversed.body.success, false);
    assert.match(reversed.body.error, /on or before/i);

    const impossible = await get(
      "/admin/statistics?range=custom&startDate=2026-02-31&endDate=2026-03-01",
      admin.token,
    );
    assert.equal(impossible.body.success, false);
  });

  it("returns a complete KPI set for every supported range", async () => {
    for (const range of ["today", "week", "month", "year"]) {
      const { status, body } = await get(`/admin/statistics?range=${range}`, admin.token);

      assert.equal(status, 200, `${range} should succeed`);
      assert.equal(body.success, true);
      assert.equal(body.range.key, range);

      for (const key of [
        "totalAppointments",
        "completedAppointments",
        "cancelledAppointments",
        "pendingAppointments",
        "acceptedAppointments",
        "aiConversations",
        "documentRequests",
        "activePatients",
        "totalDoctors",
        "totalSecretaries",
        "activeLiveChats",
      ]) {
        assert.equal(typeof body.kpis[key], "number", `${key} should be a number in ${range}`);
        assert.ok(body.kpis[key] >= 0, `${key} should not be negative`);
      }
    }
  });

  it("matches the appointment table for the reported window", async () => {
    const { body } = await get("/admin/statistics?range=year", admin.token);
    const { from, to } = body.range;
    const k = body.kpis;

    const inWindow = (extra = "") =>
      count(
        `SELECT COUNT(*) FROM appointment
          WHERE appointment_date BETWEEN '${from}' AND '${to}' ${extra}`,
      );

    assert.equal(k.totalAppointments, inWindow());
    assert.equal(k.completedAppointments, inWindow("AND status = 'completed'"));
    assert.equal(k.cancelledAppointments, inWindow("AND status = 'cancelled'"));
    assert.equal(k.pendingAppointments, inWindow("AND status = 'pending'"));
    assert.equal(k.acceptedAppointments, inWindow("AND status = 'confirmed'"));
  });

  it("matches the user table for the head counts", async () => {
    const { body } = await get("/admin/statistics?range=month", admin.token);
    const k = body.kpis;

    const roleCount = (role) =>
      count(
        `SELECT COUNT(*) FROM user
          WHERE deleted_at IS NULL AND status = 'active'
            AND JSON_CONTAINS(roles, '"${role}"')`,
      );

    assert.equal(k.activePatients, roleCount("ROLE_PATIENT"));
    assert.equal(k.totalDoctors, roleCount("ROLE_DOCTOR"));
    assert.equal(k.totalSecretaries, roleCount("ROLE_SECRETARY"));
    assert.equal(k.totalAdmins, roleCount("ROLE_ADMIN"));
  });

  it("matches the live_chat table for open conversations", async () => {
    const { body } = await get("/admin/statistics?range=month", admin.token);

    assert.equal(
      body.kpis.activeLiveChats,
      count(`SELECT COUNT(*) FROM live_chat WHERE status IN ('waiting','active')`),
    );
  });

  it("matches the rating table for the average and satisfaction", async () => {
    const { body } = await get("/admin/statistics?range=year", admin.token);
    const { from, to } = body.range;
    const k = body.kpis;

    const total = count(
      `SELECT COUNT(*) FROM doctor_rating WHERE DATE(created_at) BETWEEN '${from}' AND '${to}'`,
    );
    assert.equal(k.totalRatings, total);

    if (total === 0) {
      assert.equal(k.averageRating, null, "no ratings should read as null, not zero");
      assert.equal(k.patientSatisfaction, null);
      return;
    }

    const satisfied = count(
      `SELECT COUNT(*) FROM doctor_rating
        WHERE DATE(created_at) BETWEEN '${from}' AND '${to}' AND rating >= 4`,
    );
    assert.equal(k.patientSatisfaction, Math.round((satisfied / total) * 100));
    assert.ok(k.averageRating >= 1 && k.averageRating <= 5);
  });

  it("returns chart series that agree with the KPI totals", async () => {
    const { body } = await get("/admin/statistics?range=year", admin.token);

    const seriesTotal = body.charts.appointmentsOverTime.reduce((sum, d) => sum + d.total, 0);
    assert.equal(
      seriesTotal,
      body.kpis.totalAppointments,
      "the daily series should sum to the headline figure",
    );

    const statusTotal = body.charts.appointmentStatus.reduce((sum, s) => sum + s.count, 0);
    assert.equal(statusTotal, body.kpis.totalAppointments);

    const ratingTotal = body.charts.ratingDistribution.reduce((sum, r) => sum + r.count, 0);
    assert.equal(ratingTotal, body.kpis.totalRatings);
  });

  it("covers whole calendar periods, including days still to come", async () => {
    const { body } = await get("/admin/statistics?range=year", admin.token);

    const year = new Date().getFullYear();
    assert.equal(body.range.from, `${year}-01-01`);
    assert.equal(body.range.to, `${year}-12-31`);
  });
});

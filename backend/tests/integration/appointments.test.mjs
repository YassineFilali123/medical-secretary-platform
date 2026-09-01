import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { get, post } from "./helpers/api.mjs";
import { count, rows } from "./helpers/db.mjs";
import {
  cleanupFixtures,
  createUser,
  giveDoctorAvailability,
} from "./helpers/fixtures.mjs";

/** First bookable slot for a doctor, taken from the real availability endpoint. */
async function firstFreeSlot(patientToken, doctorId, { skipDates = [] } = {}) {
  const { body } = await get(`/availability/slots?doctorId=${doctorId}`, patientToken);
  assert.equal(body.success, true, "availability/slots should succeed");

  for (const day of body.days ?? []) {
    if (skipDates.includes(day.date)) continue;
    if (day.slots?.length) return { date: day.date, time: day.slots[0].start ?? day.slots[0] };
  }
  throw new Error("The fixture doctor has no bookable slots.");
}

describe("Patient appointments", () => {
  let patient;
  let otherPatient;
  let doctor;

  before(async () => {
    patient = await createUser("patient", "booking");
    otherPatient = await createUser("patient", "rival");
    doctor = await createUser("doctor", "booking");
    await giveDoctorAvailability(doctor.token);
  });

  after(() => cleanupFixtures());

  it("lists doctors, including the fixture doctor", async () => {
    const { status, body } = await get("/doctors", patient.token);

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.doctors));
    assert.ok(
      body.doctors.some((d) => d.id === doctor.id),
      "the active fixture doctor should be bookable",
    );
  });

  it("returns availability slots for a doctor", async () => {
    const { status, body } = await get(
      `/availability/slots?doctorId=${doctor.id}`,
      patient.token,
    );

    assert.equal(status, 200);
    assert.equal(body.success, true);
    const withSlots = (body.days ?? []).filter((d) => d.slots?.length);
    assert.ok(withSlots.length > 0, "a doctor with a schedule should have free slots");
  });

  it("rejects availability for a non-numeric doctor id", async () => {
    const { body } = await get("/availability/slots?doctorId=abc", patient.token);
    assert.equal(body.success, false);
  });

  it("creates an appointment and writes it to the database", async () => {
    const slot = await firstFreeSlot(patient.token, doctor.id);

    const { status, body } = await post("/appointments/create", patient.token, {
      doctorId: doctor.id,
      date: slot.date,
      time: slot.time,
      reason: "ITEST booking flow",
      type: "consultation",
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.appointment.doctorId, doctor.id);
    assert.equal(body.appointment.status, "pending");

    // The row must actually exist — a truthful API response is not enough.
    const stored = rows(
      `SELECT patient_user_id, doctor_user_id, appointment_date, status
         FROM appointment WHERE id = ${Number(body.appointment.id)}`,
    );
    assert.equal(stored.length, 1, "the appointment should be persisted");
    assert.equal(Number(stored[0][0]), patient.id);
    assert.equal(Number(stored[0][1]), doctor.id);
    assert.equal(stored[0][3], "pending");
  });

  it("prevents two patients booking the same doctor at the same time", async () => {
    const slot = await firstFreeSlot(otherPatient.token, doctor.id);

    const first = await post("/appointments/create", otherPatient.token, {
      doctorId: doctor.id,
      date: slot.date,
      time: slot.time,
      reason: "ITEST double booking A",
      type: "consultation",
    });
    assert.equal(first.body.success, true, "the first booking should succeed");

    const rival = await createUser("patient", "double");
    const second = await post("/appointments/create", rival.token, {
      doctorId: doctor.id,
      date: slot.date,
      time: slot.time,
      reason: "ITEST double booking B",
      type: "consultation",
    });

    assert.equal(second.body.success, false, "the second booking must be refused");

    // Exactly one active appointment may hold that slot.
    const held = count(
      `SELECT COUNT(*) FROM appointment
        WHERE doctor_user_id = ${doctor.id}
          AND appointment_date = '${slot.date}'
          AND start_time = '${slot.time}:00'
          AND status IN ('pending','confirmed')`,
    );
    assert.equal(held, 1, "only one active appointment may hold a slot");
  });

  it("allows only one appointment per patient per day", async () => {
    const solo = await createUser("patient", "perday");
    const slots = await get(`/availability/slots?doctorId=${doctor.id}`, solo.token);

    const day = (slots.body.days ?? []).find((d) => (d.slots?.length ?? 0) >= 2);
    assert.ok(day, "need a day with at least two free slots for this test");

    const first = await post("/appointments/create", solo.token, {
      doctorId: doctor.id,
      date: day.date,
      time: day.slots[0].start ?? day.slots[0],
      reason: "ITEST per-day first",
      type: "consultation",
    });
    assert.equal(first.body.success, true);

    const second = await post("/appointments/create", solo.token, {
      doctorId: doctor.id,
      date: day.date,
      time: day.slots[1].start ?? day.slots[1],
      reason: "ITEST per-day second",
      type: "consultation",
    });

    assert.equal(second.body.success, false);
    assert.match(second.body.error, /one appointment per day/i);
  });

  it("rejects a booking with no reason", async () => {
    const slot = await firstFreeSlot(patient.token, doctor.id);
    const { body } = await post("/appointments/create", patient.token, {
      doctorId: doctor.id,
      date: slot.date,
      time: slot.time,
      reason: "",
      type: "consultation",
    });

    assert.equal(body.success, false);
    assert.match(body.error, /reason/i);
  });

  it("rejects a booking for a doctor that does not exist", async () => {
    const { body } = await post("/appointments/create", patient.token, {
      doctorId: 99999999,
      date: "2030-01-01",
      time: "09:00",
      reason: "ITEST bad doctor",
      type: "consultation",
    });

    assert.equal(body.success, false);
  });

  it("cancels an appointment and records the change", async () => {
    const canceller = await createUser("patient", "cancel");
    const slot = await firstFreeSlot(canceller.token, doctor.id);

    const created = await post("/appointments/create", canceller.token, {
      doctorId: doctor.id,
      date: slot.date,
      time: slot.time,
      reason: "ITEST to be cancelled",
      type: "consultation",
    });
    assert.equal(created.body.success, true);
    const id = created.body.appointment.id;

    const cancelled = await post("/appointments/cancel", canceller.token, {
      id,
      reason: "ITEST changed my mind",
    });

    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.success, true);

    const status = rows(`SELECT status FROM appointment WHERE id = ${Number(id)}`);
    assert.equal(status[0][0], "cancelled", "the database must reflect the cancellation");
  });

  it("stops a patient cancelling someone else's appointment", async () => {
    const owner = await createUser("patient", "owner");
    const stranger = await createUser("patient", "stranger");
    const slot = await firstFreeSlot(owner.token, doctor.id);

    const created = await post("/appointments/create", owner.token, {
      doctorId: doctor.id,
      date: slot.date,
      time: slot.time,
      reason: "ITEST ownership",
      type: "consultation",
    });
    assert.equal(created.body.success, true);

    const attempt = await post("/appointments/cancel", stranger.token, {
      id: created.body.appointment.id,
      reason: "ITEST not mine",
    });

    assert.equal(attempt.body.success, false);

    const status = rows(
      `SELECT status FROM appointment WHERE id = ${Number(created.body.appointment.id)}`,
    );
    assert.notEqual(status[0][0], "cancelled", "a stranger must not be able to cancel it");
  });

  it("scopes the appointment list to the signed-in patient", async () => {
    const { body } = await get("/appointments", patient.token);
    assert.equal(body.success, true);

    for (const appointment of body.appointments) {
      assert.equal(
        appointment.patientId,
        patient.id,
        "a patient must only see their own appointments",
      );
    }
  });
});

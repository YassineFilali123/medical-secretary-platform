import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { get, post } from "./helpers/api.mjs";
import { count } from "./helpers/db.mjs";
import {
  adminToken,
  cleanupFixtures,
  createUser,
  giveDoctorAvailability,
} from "./helpers/fixtures.mjs";

/**
 * The assistant is an action state machine, not free-form text generation, so
 * these assert on `nextAction` and on real side effects rather than on wording.
 * Free-text turns may or may not reach Gemini depending on the environment, so
 * nothing here depends on a particular sentence coming back.
 */
describe("AI chat", () => {
  let patient;
  let doctor;

  before(async () => {
    patient = await createUser("patient", "ai");
    doctor = await createUser("doctor", "ai");
    await giveDoctorAvailability(doctor.token);
  });

  after(() => cleanupFixtures());

  it("requires authentication", async () => {
    const { status, body } = await post("/ai/chat", null, {
      action: "message",
      message: "hello",
    });

    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it("refuses a non-patient", async () => {
    const { body } = await post("/ai/chat", doctor.token, {
      action: "message",
      message: "hello",
    });

    assert.equal(body.success, false);
  });

  it("rejects an unknown action", async () => {
    const { body } = await post("/ai/chat", patient.token, { action: "sudo_make_me_admin" });
    assert.equal(body.success, false);
    assert.match(body.error, /unknown ai chat action/i);
  });

  it("rejects an empty message", async () => {
    const { body } = await post("/ai/chat", patient.token, { action: "message", message: "  " });
    assert.equal(body.success, false);
  });

  it("reaches the backend and answers a free-text message", async () => {
    const { status, body } = await post("/ai/chat", patient.token, {
      action: "message",
      message: "Hello, I have a question about my care.",
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(typeof body.message === "string" && body.message.length > 0);
    // Either a real answer or the fallback menu — both are valid outcomes.
    assert.ok(["message", "show_fallback_menu"].includes(body.nextAction));
  });

  it("starts the booking flow and offers real doctors", async () => {
    const { body } = await post("/ai/chat", patient.token, { action: "start_booking" });

    assert.equal(body.success, true);
    assert.equal(body.nextAction, "select_doctor");
    assert.ok(Array.isArray(body.doctors));
    assert.ok(
      body.doctors.some((d) => d.id === doctor.id),
      "the assistant should offer the same directory as /api/doctors",
    );
  });

  it("offers real availability once a doctor is chosen", async () => {
    const { body } = await post("/ai/chat", patient.token, {
      action: "select_doctor",
      doctorId: doctor.id,
    });

    assert.equal(body.success, true);
    assert.equal(body.nextAction, "select_slot");
    assert.ok(Array.isArray(body.days) && body.days.length > 0);
  });

  it("books a real appointment through the assistant", async () => {
    const booker = await createUser("patient", "aibook");

    const slots = await post("/ai/chat", booker.token, {
      action: "select_doctor",
      doctorId: doctor.id,
    });
    const day = slots.body.days[0];
    const time = day.slots[0].start ?? day.slots[0];

    const { body } = await post("/ai/chat", booker.token, {
      action: "select_slot",
      doctorId: doctor.id,
      date: day.date,
      time,
    });

    assert.equal(body.success, true);
    assert.ok(body.appointment, "the assistant should return the created appointment");

    // It must be a real row owned by that patient, not a simulated reply.
    const stored = count(
      `SELECT COUNT(*) FROM appointment
        WHERE id = ${Number(body.appointment.id)} AND patient_user_id = ${booker.id}`,
    );
    assert.equal(stored, 1, "the assistant's booking must reach the database");
  });

  it("lists the patient's own appointments for cancellation", async () => {
    const canceller = await createUser("patient", "aicancel");

    const slots = await post("/ai/chat", canceller.token, {
      action: "select_doctor",
      doctorId: doctor.id,
    });
    const day = slots.body.days[0];
    await post("/ai/chat", canceller.token, {
      action: "select_slot",
      doctorId: doctor.id,
      date: day.date,
      time: day.slots[0].start ?? day.slots[0],
    });

    const { body } = await post("/ai/chat", canceller.token, { action: "start_cancellation" });

    assert.equal(body.success, true);
    assert.equal(body.nextAction, "select_cancellation");
    assert.ok(body.cancellableAppointments.length > 0);
    for (const appointment of body.cancellableAppointments) {
      assert.equal(
        appointment.patientId,
        canceller.id,
        "the assistant must only offer the caller's own appointments",
      );
    }
  });

  it("cancels an appointment through the assistant", async () => {
    const canceller = await createUser("patient", "aicancel2");

    const slots = await post("/ai/chat", canceller.token, {
      action: "select_doctor",
      doctorId: doctor.id,
    });
    const day = slots.body.days[0];
    const created = await post("/ai/chat", canceller.token, {
      action: "select_slot",
      doctorId: doctor.id,
      date: day.date,
      time: day.slots[0].start ?? day.slots[0],
    });
    const appointmentId = created.body.appointment.id;

    const { body } = await post("/ai/chat", canceller.token, {
      action: "confirm_cancellation",
      appointmentId,
    });

    assert.equal(body.success, true);
    assert.equal(body.cancelled, true);

    const cancelled = count(
      `SELECT COUNT(*) FROM appointment
        WHERE id = ${Number(appointmentId)} AND status = 'cancelled'`,
    );
    assert.equal(cancelled, 1, "the cancellation must reach the database");
  });

  it("offers the document types the document module defines", async () => {
    const { body } = await post("/ai/chat", patient.token, {
      action: "start_document_request",
    });

    assert.equal(body.success, true);
    assert.equal(body.nextAction, "select_document_type");
    assert.ok(Array.isArray(body.documentTypes) && body.documentTypes.length > 0);
    assert.ok(body.documentTypes.every((t) => t.key && t.label));
  });

  it("creates a real document request through the assistant", async () => {
    const requester = await createUser("patient", "aidoc");

    const types = await post("/ai/chat", requester.token, {
      action: "start_document_request",
    });
    const type = types.body.documentTypes[0].key;

    const { body } = await post("/ai/chat", requester.token, {
      action: "select_document_type",
      documentType: type,
    });

    assert.equal(body.success, true);

    const stored = count(
      `SELECT COUNT(*) FROM document_request WHERE patient_user_id = ${requester.id}`,
    );
    assert.ok(stored >= 1, "the assistant's document request must reach the database");
  });

  it("rejects an invalid document type", async () => {
    const { body } = await post("/ai/chat", patient.token, {
      action: "select_document_type",
      documentType: "not_a_real_document",
    });

    assert.equal(body.success, false);
  });

  it("handles an unintelligible message gracefully", async () => {
    const { body } = await post("/ai/chat", patient.token, {
      action: "message",
      message: "zzxqwv plorbnak flimtreb",
    });

    assert.equal(body.success, true);

    // Two outcomes are both correct here, and which one happens depends on
    // Gemini's live (non-deterministic) reply: AiChatController prefers a
    // real Gemini answer over the canned menu when Gemini manages to say
    // something useful, and only falls back to the menu when it doesn't
    // (see AiChatController::handle, "a curated answer... beats a generic
    // one"). Pin down the contract, not which branch Gemini happens to take.
    assert.ok(
      ["message", "show_fallback_menu"].includes(body.nextAction),
      `expected a conversational reply or the fallback menu, got "${body.nextAction}"`,
    );

    if (body.nextAction === "show_fallback_menu") {
      assert.ok(Array.isArray(body.fallbackOptions));
      assert.ok(body.fallbackOptions.length > 0, "the menu must offer at least one service");

      // The options come from the active scenarios, not a hard-coded list.
      const actions = body.fallbackOptions.map((o) => o.action);
      const active = await get("/admin/ai/scenarios", adminToken().token);
      const activeBuiltIns = active.body.scenarios
        .filter((s) => s.isBuiltIn && s.isActive && s.name !== "unknown")
        .map((s) => s.name);

      for (const action of actions) {
        assert.ok(
          activeBuiltIns.includes(action),
          `the menu offered "${action}", which is not an active built-in scenario`,
        );
      }
    } else {
      assert.equal(typeof body.message, "string");
      assert.ok(body.message.length > 0, "a conversational reply must not be empty");
    }
  });
});

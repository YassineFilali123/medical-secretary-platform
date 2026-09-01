import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { get, post } from "./helpers/api.mjs";
import { scalar } from "./helpers/db.mjs";
import {
  cleanupFixtures,
  createUser,
  giveDoctorAvailability,
} from "./helpers/fixtures.mjs";

/**
 * A doctor may read the AI conversations of their own patients only. The link
 * is an appointment: booking with a doctor is what makes someone their patient.
 */
describe("Doctor AI conversations", () => {
  let doctorA;
  let doctorB;
  let patientOfA;
  let conversationId;

  before(async () => {
    doctorA = await createUser("doctor", "convA");
    doctorB = await createUser("doctor", "convB");
    patientOfA = await createUser("patient", "conv");

    await giveDoctorAvailability(doctorA.token);
    await giveDoctorAvailability(doctorB.token);

    // Booking with doctor A is what makes this patient A's patient.
    const slots = await get(`/availability/slots?doctorId=${doctorA.id}`, patientOfA.token);
    const day = slots.body.days.find((d) => d.slots?.length);
    await post("/appointments/create", patientOfA.token, {
      doctorId: doctorA.id,
      date: day.date,
      time: day.slots[0].start ?? day.slots[0],
      reason: "ITEST conversation link",
      type: "consultation",
    });

    // Talking to the assistant creates the conversation the doctor will read.
    await post("/ai/chat", patientOfA.token, {
      action: "message",
      message: "ITEST I have a question about my treatment.",
    });

    conversationId = Number(
      scalar(`SELECT id FROM live_chat WHERE patient_user_id = ${patientOfA.id}
               ORDER BY id DESC LIMIT 1`),
    );
  });

  after(() => cleanupFixtures());

  it("records the assistant conversation so it can be reviewed", () => {
    assert.ok(conversationId > 0, "talking to the assistant should create a conversation");
  });

  it("lists the conversation for the patient's own doctor", async () => {
    const { status, body } = await get("/doctor/conversations", doctorA.token);

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(
      body.conversations.some((c) => c.patientId === patientOfA.id),
      "doctor A should see their own patient's conversation",
    );
  });

  it("hides it from a doctor who has no appointment with that patient", async () => {
    const { status, body } = await get("/doctor/conversations", doctorB.token);

    assert.equal(status, 200);
    assert.ok(
      !body.conversations.some((c) => c.patientId === patientOfA.id),
      "doctor B must not see another doctor's patient",
    );
  });

  it("lets the owning doctor open the transcript", async () => {
    const { status, body } = await get(
      `/doctor/conversations/get?id=${conversationId}`,
      doctorA.token,
    );

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.conversation.patientId, patientOfA.id);
    assert.ok(Array.isArray(body.messages));
    assert.equal(body.readOnly, true, "the doctor's view must be read-only");
  });

  it("returns 404 when another doctor guesses the conversation id", async () => {
    const { status, body } = await get(
      `/doctor/conversations/get?id=${conversationId}`,
      doctorB.token,
    );

    assert.equal(status, 404, "probing must not distinguish 'forbidden' from 'missing'");
    assert.equal(body.success, false);
  });

  it("refuses a patient and requires a valid id", async () => {
    const asPatient = await get("/doctor/conversations", patientOfA.token);
    assert.equal(asPatient.status, 403);

    const badId = await get("/doctor/conversations/get?id=abc", doctorA.token);
    assert.equal(badId.body.success, false);
  });

  it("exposes no write endpoint for conversations", async () => {
    // The doctor's view is deliberately read-only; there is no such route.
    const { status } = await post("/doctor/conversations/delete", doctorA.token, {
      id: conversationId,
    });
    assert.equal(status, 404, "there must be no way for a doctor to alter a transcript");
  });
});

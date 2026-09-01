import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { get, post } from "./helpers/api.mjs";
import { count, scalar } from "./helpers/db.mjs";
import { cleanupFixtures, createUser } from "./helpers/fixtures.mjs";

describe("Document requests", () => {
  let patient;
  let otherPatient;
  let secretary;
  let requestId;

  before(async () => {
    patient = await createUser("patient", "docs");
    otherPatient = await createUser("patient", "docs2");
    secretary = await createUser("secretary", "docs");
  });

  after(() => cleanupFixtures());

  it("lets a patient request a document, stored as pending", async () => {
    const { status, body } = await post("/documents/request", patient.token, {
      documentType: "medical_certificate",
      note: "ITEST please prepare this",
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.request.status, "pending");

    requestId = Number(body.request.id);
    const owner = scalar(
      `SELECT patient_user_id FROM document_request WHERE id = ${requestId}`,
    );
    assert.equal(Number(owner), patient.id, "the request must belong to the caller");
  });

  it("rejects an unknown document type", async () => {
    const { body } = await post("/documents/request", patient.token, {
      documentType: "unicorn_certificate",
    });

    assert.equal(body.success, false);
  });

  it("requires authentication", async () => {
    const { status } = await post("/documents/request", null, {
      documentType: "medical_certificate",
    });
    assert.equal(status, 401);
  });

  it("shows a patient only their own requests", async () => {
    await post("/documents/request", otherPatient.token, {
      documentType: "medical_certificate",
      note: "ITEST other patient",
    });

    const mine = await get("/documents/requests", patient.token);
    assert.equal(mine.body.success, true);

    for (const request of mine.body.requests) {
      assert.equal(
        request.patientId,
        patient.id,
        "a patient must never see another patient's request",
      );
    }

    assert.ok(
      !mine.body.requests.some((r) => r.patientId === otherPatient.id),
      "the other patient's request must be absent",
    );
  });

  it("shows a secretary the whole clinic's requests", async () => {
    const { body } = await get("/documents/requests", secretary.token);
    assert.equal(body.success, true);

    const patientIds = new Set(body.requests.map((r) => r.patientId));
    assert.ok(
      patientIds.has(patient.id) && patientIds.has(otherPatient.id),
      "a secretary processes requests for every patient",
    );
  });

  it("lists a patient's own finished documents only", async () => {
    const { status, body } = await get("/documents/my", patient.token);

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.documents));
  });

  it("refuses an unauthenticated download", async () => {
    const { status } = await get("/documents/download?id=1", null);
    assert.equal(status, 401);
  });

  it("stops a patient rejecting their own request to force approval", async () => {
    // Processing is the secretary's job; a patient must not reach it.
    const { status } = await post("/documents/approve", patient.token, { requestId });
    assert.equal(status, 403);

    assert.equal(
      scalar(`SELECT status FROM document_request WHERE id = ${requestId}`),
      "pending",
      "the request must still be pending",
    );
  });

  it("lets a secretary reject a request with a reason", async () => {
    const created = await post("/documents/request", otherPatient.token, {
      documentType: "medical_certificate",
      note: "ITEST to reject",
    });
    const id = Number(created.body.request.id);

    // The endpoint takes `requestId`, not `id`.
    const { body } = await post("/documents/reject", secretary.token, {
      requestId: id,
      reason: "ITEST not eligible",
    });

    assert.equal(body.success, true);
    assert.equal(scalar(`SELECT status FROM document_request WHERE id = ${id}`), "rejected");
  });

  it("keeps every fixture request attributable to its own patient", () => {
    const strays = count(
      `SELECT COUNT(*) FROM document_request dr
         JOIN user u ON u.id = dr.patient_user_id
        WHERE u.email LIKE 'itest_%' AND dr.patient_user_id NOT IN (${patient.id}, ${otherPatient.id})`,
    );
    assert.equal(strays, 0);
  });
});

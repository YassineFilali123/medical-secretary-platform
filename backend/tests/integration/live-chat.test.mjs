import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { get, post } from "./helpers/api.mjs";
import { count, rows } from "./helpers/db.mjs";
import { cleanupFixtures, createUser } from "./helpers/fixtures.mjs";

describe("Secretary live chat", () => {
  let patient;
  let secretaryA;
  let secretaryB;

  before(async () => {
    patient = await createUser("patient", "chat");
    secretaryA = await createUser("secretary", "A");
    secretaryB = await createUser("secretary", "B");
  });

  after(() => cleanupFixtures());

  it("lets a patient open a live chat request, stored as waiting", async () => {
    const { status, body } = await post("/livechat/start", patient.token, {});

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.chat.status, "waiting");
    assert.equal(body.chat.patientId, patient.id);

    const stored = rows(
      `SELECT status, patient_user_id FROM live_chat WHERE id = ${Number(body.chat.id)}`,
    );
    assert.equal(stored[0][0], "waiting");
    assert.equal(Number(stored[0][1]), patient.id);
  });

  it("shows the waiting conversation to a secretary", async () => {
    const requester = await createUser("patient", "queue");
    const started = await post("/livechat/start", requester.token, {});
    assert.equal(started.body.success, true);

    const { status, body } = await get("/livechat/waiting", secretaryA.token);

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(
      body.chats.some((c) => c.id === started.body.chat.id),
      "the new request should appear in the waiting queue",
    );
  });

  it("hides the waiting queue from a patient", async () => {
    const { status, body } = await get("/livechat/waiting", patient.token);
    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it("gives ownership to the first secretary and refuses the second with 409", async () => {
    const requester = await createUser("patient", "race");
    const started = await post("/livechat/start", requester.token, {});
    const chatId = started.body.chat.id;

    // Both secretaries reach for the same conversation at once.
    const [resultA, resultB] = await Promise.all([
      post("/livechat/accept", secretaryA.token, { chatId }),
      post("/livechat/accept", secretaryB.token, { chatId }),
    ]);

    const winners = [resultA, resultB].filter((r) => r.body.success);
    const losers = [resultA, resultB].filter((r) => !r.body.success);

    assert.equal(winners.length, 1, "exactly one secretary may win the conversation");
    assert.equal(losers.length, 1, "the other must be refused");
    assert.equal(losers[0].status, 409, "the loser should get a conflict, not a generic error");
    assert.match(losers[0].body.error, /already accepted|does not exist/i);

    // The database must agree with whoever the API said won.
    const owner = rows(
      `SELECT secretary_user_id, status FROM live_chat WHERE id = ${Number(chatId)}`,
    );
    assert.equal(Number(owner[0][0]), winners[0].body.chat.secretaryId);
    assert.equal(owner[0][1], "active");
  });

  it("stops a second secretary reading or writing another's conversation", async () => {
    const requester = await createUser("patient", "private");
    const started = await post("/livechat/start", requester.token, {});
    const chatId = started.body.chat.id;

    const accepted = await post("/livechat/accept", secretaryA.token, { chatId });
    assert.equal(accepted.body.success, true);

    const read = await get(`/livechat/messages?chatId=${chatId}&since=0`, secretaryB.token);
    assert.equal(read.status, 403, "an unassigned secretary must not read the transcript");

    const write = await post("/livechat/message", secretaryB.token, {
      chatId,
      content: "ITEST intrusion",
    });
    assert.equal(write.status, 403, "an unassigned secretary must not post");

    const leaked = count(
      `SELECT COUNT(*) FROM live_chat_message
        WHERE chat_id = ${Number(chatId)} AND content = 'ITEST intrusion'`,
    );
    assert.equal(leaked, 0, "the refused message must not be stored");
  });

  it("lets the patient and the assigned secretary exchange messages", async () => {
    const requester = await createUser("patient", "talk");
    const started = await post("/livechat/start", requester.token, {});
    const chatId = started.body.chat.id;
    await post("/livechat/accept", secretaryA.token, { chatId });

    const fromPatient = await post("/livechat/message", requester.token, {
      chatId,
      content: "ITEST hello from patient",
    });
    assert.equal(fromPatient.body.success, true);
    assert.equal(fromPatient.body.message.senderRole, "patient");

    const fromSecretary = await post("/livechat/message", secretaryA.token, {
      chatId,
      content: "ITEST hello from secretary",
    });
    assert.equal(fromSecretary.body.success, true);
    assert.equal(fromSecretary.body.message.senderRole, "secretary");

    // Both sides read the same transcript.
    const patientView = await get(`/livechat/messages?chatId=${chatId}&since=0`, requester.token);
    const secretaryView = await get(
      `/livechat/messages?chatId=${chatId}&since=0`,
      secretaryA.token,
    );

    const texts = (res) => res.body.messages.map((m) => m.content);
    assert.ok(texts(patientView).includes("ITEST hello from secretary"));
    assert.ok(texts(secretaryView).includes("ITEST hello from patient"));

    // Persistence, not just transport.
    const stored = count(
      `SELECT COUNT(*) FROM live_chat_message
        WHERE chat_id = ${Number(chatId)} AND content LIKE 'ITEST hello%'`,
    );
    assert.equal(stored, 2);
  });

  it("rejects an empty message", async () => {
    const requester = await createUser("patient", "empty");
    const started = await post("/livechat/start", requester.token, {});
    await post("/livechat/accept", secretaryA.token, { chatId: started.body.chat.id });

    const { body } = await post("/livechat/message", requester.token, {
      chatId: started.body.chat.id,
      content: "   ",
    });

    assert.equal(body.success, false);
  });

  it("closes a conversation and keeps its messages", async () => {
    const requester = await createUser("patient", "close");
    const started = await post("/livechat/start", requester.token, {});
    const chatId = started.body.chat.id;
    await post("/livechat/accept", secretaryA.token, { chatId });
    await post("/livechat/message", requester.token, { chatId, content: "ITEST keep me" });

    const closed = await post("/livechat/close", secretaryA.token, { chatId });
    assert.equal(closed.status, 200);
    assert.equal(closed.body.success, true);

    const chat = rows(`SELECT status FROM live_chat WHERE id = ${Number(chatId)}`);
    assert.equal(chat[0][0], "closed");

    // Closing must not destroy history.
    const kept = count(
      `SELECT COUNT(*) FROM live_chat_message WHERE chat_id = ${Number(chatId)}`,
    );
    assert.ok(kept > 0, "closing a chat must keep its messages");

    // And it leaves the secretary's active list.
    const active = await get("/livechat/active", secretaryA.token);
    assert.ok(!active.body.chats.some((c) => c.id === chatId));
  });

  it("stops a secretary closing a conversation they do not own", async () => {
    const requester = await createUser("patient", "notmine");
    const started = await post("/livechat/start", requester.token, {});
    const chatId = started.body.chat.id;
    await post("/livechat/accept", secretaryA.token, { chatId });

    const attempt = await post("/livechat/close", secretaryB.token, { chatId });
    assert.equal(attempt.status, 403);

    const chat = rows(`SELECT status FROM live_chat WHERE id = ${Number(chatId)}`);
    assert.equal(chat[0][0], "active", "the conversation must stay open");
  });
});

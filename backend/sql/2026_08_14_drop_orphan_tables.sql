-- Drop orphan tables (Step 6 final cleanup).
--
-- Each table below was verified to have ZERO references anywhere in the code
-- that actually runs: backend/api/*.php, backend/realtime/*.js and the whole
-- of src/. They are leftovers from abandoned work, not part of the product.
--
--   ai_conversation (3 rows)  ) An earlier, never-finished attempt at storing AI
--   ai_message      (9 rows)  ) chats. The shipped feature stores AI turns in
--                               live_chat / live_chat_message instead, which is
--                               what Doctor AI Conversations reads. Keeping both
--                               left two competing sources of truth.
--
--   follow_up_availability_slot (0 rows)  Superseded by doctor_availability.
--   user_avatar                 (0 rows)  Superseded by user_profile.avatar_url
--   user_avatar_rate            (1 row)   (see 2026_07_26_revert_to_url_avatar).
--
-- The contents of all five were dumped to
--   backend/sql/2026_08_14_orphan_tables_backup.sql
-- before running this, so the change is reversible with:
--   mysql -u root medisecretary < backend/sql/2026_08_14_orphan_tables_backup.sql

-- Child first: ai_message has a foreign key onto ai_conversation.
DROP TABLE IF EXISTS `ai_message`;
DROP TABLE IF EXISTS `ai_conversation`;

DROP TABLE IF EXISTS `follow_up_availability_slot`;

DROP TABLE IF EXISTS `user_avatar_rate`;
DROP TABLE IF EXISTS `user_avatar`;

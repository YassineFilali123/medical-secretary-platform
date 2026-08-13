<?php

/**
 * Administrator management of the AI assistant: settings, FAQ, and scenarios.
 *
 * Everything here operates on tables that already existed:
 *   ai_setting  — the editable behaviour added alongside this controller
 *   faq         — question / answer / category / is_active
 *   ai_intent   — the conversation scenarios
 *   ai_keyword  — the phrases that match an intent or an FAQ
 *
 * No second AI, conversation, message, or FAQ system is introduced. The chat
 * itself remains AiChatController; this only edits what that controller reads.
 *
 * SECURITY
 *   requireAdmin() runs first in every public method, and index.php registers
 *   no route that reaches these without it.
 *
 *   The Gemini API key is never returned. settings() reports only whether a key
 *   is present, as a boolean, so the admin screen can show "configured" without
 *   the credential ever entering a response body.
 */
class AdminAiController
{
    /**
     * Settings the admin may write.
     *
     * Which chatbot options are offered is deliberately NOT here: that is
     * ai_intent.is_active, managed on the Conversation Scenarios screen. Having
     * a second switch for the same thing would let the two disagree, and an
     * admin would have no way to tell which one was actually in force.
     */
    private const BOOLEAN_KEYS = [
        'assistant_enabled',
        'faq_enabled',
    ];

    private const TEXT_KEYS = [
        'welcome_message',
        'fallback_message',
    ];

    private const MAX_TEXT_LENGTH = 1000;
    private const MAX_QUESTION_LENGTH = 500;
    private const MAX_ANSWER_LENGTH = 5000;
    private const MAX_CATEGORY_LENGTH = 100;
    private const MAX_INTENT_NAME_LENGTH = 100;

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // =========================================================================
    // GET /api/admin/ai/settings
    // =========================================================================
    public function settings(): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $stored = $this->readSettings();

        $settings = [];
        foreach (self::BOOLEAN_KEYS as $key) {
            $settings[$key] = ($stored[$key] ?? '0') === '1';
        }
        foreach (self::TEXT_KEYS as $key) {
            $settings[$key] = $stored[$key] ?? '';
        }

        return [
            'success'  => true,
            'settings' => $settings,
            // Presence only. The key itself stays in the environment and is
            // never serialised into a response.
            'gemini'   => [
                'configured' => $this->geminiKeyPresent(),
                'model'      => $this->env('GEMINI_MODEL') ?? 'gemini-2.5-flash',
                'note'       => 'The API key is read from the server environment and is never sent to the browser.',
            ],
        ];
    }

    // =========================================================================
    // POST /api/admin/ai/settings   { assistant_enabled?, welcome_message?, ... }
    // =========================================================================
    public function updateSettings(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $writes = [];

        foreach (self::BOOLEAN_KEYS as $key) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            $value = $data[$key];
            if (!is_bool($value) && $value !== 0 && $value !== 1 && $value !== '0' && $value !== '1') {
                return ['success' => false, 'error' => "{$key} must be true or false."];
            }
            $writes[$key] = ($value === true || $value === 1 || $value === '1') ? '1' : '0';
        }

        foreach (self::TEXT_KEYS as $key) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            if (!is_string($data[$key])) {
                return ['success' => false, 'error' => "{$key} must be text."];
            }
            $text = trim($data[$key]);
            if ($text === '') {
                return ['success' => false, 'error' => $this->label($key) . ' cannot be empty.'];
            }
            if (mb_strlen($text) > self::MAX_TEXT_LENGTH) {
                return [
                    'success' => false,
                    'error'   => $this->label($key) . ' must be ' . self::MAX_TEXT_LENGTH . ' characters or fewer.',
                ];
            }
            $writes[$key] = $text;
        }

        if ($writes === []) {
            return ['success' => false, 'error' => 'No recognised settings were supplied.'];
        }

        $stmt = $this->db->prepare(
            "INSERT INTO ai_setting (setting_key, setting_value, updated_at, updated_by)
             VALUES (?, ?, NOW(), ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value),
                                     updated_at    = NOW(),
                                     updated_by    = VALUES(updated_by)"
        );
        foreach ($writes as $key => $value) {
            $stmt->execute([$key, $value, $adminId]);
        }

        return array_merge(
            ['message' => 'AI settings updated.'],
            $this->settings()
        );
    }

    // =========================================================================
    // FAQ
    // =========================================================================

    /** GET /api/admin/ai/faqs[?q=&category=&status=] */
    public function faqs(array $query): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $sql = "SELECT f.id, f.intent_id, f.question, f.answer, f.category,
                       f.is_active, f.sort_order, f.created_at, f.updated_at,
                       i.name AS intent_name
                  FROM faq f
                  LEFT JOIN ai_intent i ON i.id = f.intent_id
                 WHERE 1 = 1";
        $params = [];

        $rawQ = $query['q'] ?? null;
        if (is_string($rawQ) && trim($rawQ) !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], trim($rawQ)) . '%';
            $sql .= ' AND (f.question LIKE ? OR f.answer LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }

        $category = $query['category'] ?? null;
        if (is_string($category) && $category !== '' && $category !== 'all') {
            $sql .= ' AND f.category = ?';
            $params[] = $category;
        }

        $status = $query['status'] ?? null;
        if (is_string($status) && $status !== '' && $status !== 'all') {
            if (!in_array($status, ['active', 'inactive'], true)) {
                return ['success' => false, 'error' => 'status must be active or inactive.'];
            }
            $sql .= ' AND f.is_active = ?';
            $params[] = $status === 'active' ? 1 : 0;
        }

        $sql .= ' ORDER BY f.category ASC, f.sort_order ASC, f.id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $categories = $this->db
            ->query('SELECT DISTINCT category FROM faq ORDER BY category ASC')
            ->fetchAll(PDO::FETCH_COLUMN);

        return [
            'success'    => true,
            'faqs'       => array_map([$this, 'shapeFaq'], $stmt->fetchAll()),
            'categories' => $categories,
        ];
    }

    /** POST /api/admin/ai/faqs/create */
    public function createFaq(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $fields = $this->validateFaq($data, true);
        if (isset($fields['error'])) {
            return $fields;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO faq (intent_id, question, answer, category, is_active, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([
            $fields['intent_id'],
            $fields['question'],
            $fields['answer'],
            $fields['category'],
            $fields['is_active'],
            $fields['sort_order'],
        ]);

        return [
            'success' => true,
            'message' => 'FAQ created.',
            'faq'     => $this->fetchFaq((int) $this->db->lastInsertId()),
        ];
    }

    /** POST /api/admin/ai/faqs/update */
    public function updateFaq(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid FAQ id is required.'];
        }
        if ($this->fetchFaq($id) === null) {
            return ['success' => false, 'error' => 'FAQ not found.', 'status' => 404];
        }

        $fields = $this->validateFaq($data, false);
        if (isset($fields['error'])) {
            return $fields;
        }

        $columns = [];
        $values  = [];
        foreach (['intent_id', 'question', 'answer', 'category', 'is_active', 'sort_order'] as $col) {
            if (array_key_exists($col, $fields)) {
                $columns[] = "{$col} = ?";
                $values[]  = $fields[$col];
            }
        }

        if ($columns === []) {
            return ['success' => true, 'message' => 'Nothing to update.', 'faq' => $this->fetchFaq($id)];
        }

        $values[] = $id;
        $stmt = $this->db->prepare('UPDATE faq SET ' . implode(', ', $columns) . ' WHERE id = ?');
        $stmt->execute($values);

        return ['success' => true, 'message' => 'FAQ updated.', 'faq' => $this->fetchFaq($id)];
    }

    /** POST /api/admin/ai/faqs/toggle   { id } */
    public function toggleFaq(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid FAQ id is required.'];
        }
        if ($this->fetchFaq($id) === null) {
            return ['success' => false, 'error' => 'FAQ not found.', 'status' => 404];
        }

        $this->db->prepare('UPDATE faq SET is_active = 1 - is_active WHERE id = ?')->execute([$id]);
        $faq = $this->fetchFaq($id);

        return [
            'success' => true,
            'message' => $faq['isActive'] ? 'FAQ activated.' : 'FAQ deactivated.',
            'faq'     => $faq,
        ];
    }

    /** POST /api/admin/ai/faqs/delete   { id } */
    public function deleteFaq(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid FAQ id is required.'];
        }
        if ($this->fetchFaq($id) === null) {
            return ['success' => false, 'error' => 'FAQ not found.', 'status' => 404];
        }

        // ai_keyword rows pointing at this FAQ go with it (FK ON DELETE CASCADE).
        // Nothing else references faq, and no conversation stores a FAQ id, so a
        // hard delete cannot orphan history here.
        $this->db->prepare('DELETE FROM faq WHERE id = ?')->execute([$id]);

        return ['success' => true, 'message' => 'FAQ deleted.', 'id' => $id];
    }

    // =========================================================================
    // Conversation scenarios (ai_intent)
    // =========================================================================

    /** GET /api/admin/ai/scenarios */
    public function scenarios(array $query): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $stmt = $this->db->query(
            "SELECT i.id, i.name, i.description, i.priority, i.is_active,
                    i.created_at, i.updated_at,
                    (SELECT COUNT(*) FROM ai_keyword k WHERE k.intent_id = i.id) AS keyword_count,
                    (SELECT COUNT(*) FROM faq f WHERE f.intent_id = i.id)        AS faq_count
               FROM ai_intent i
              ORDER BY i.priority ASC, i.name ASC"
        );

        $scenarios = array_map(function (array $r): array {
            return [
                'id'           => (int) $r['id'],
                'name'         => $r['name'],
                'description'  => $r['description'],
                'priority'     => (int) $r['priority'],
                'isActive'     => (bool) $r['is_active'],
                'keywordCount' => (int) $r['keyword_count'],
                'faqCount'     => (int) $r['faq_count'],
                'keywords'     => $this->keywordsFor((int) $r['id']),
                // A scenario backed by a flow in AiChatController cannot be
                // deleted — the code path would still exist with no row to
                // describe it. The UI uses this to hide the delete action.
                'isBuiltIn'    => $this->isBuiltIn($r['name']),
                'createdAt'    => $r['created_at'],
                'updatedAt'    => $r['updated_at'],
            ];
        }, $stmt->fetchAll());

        return ['success' => true, 'scenarios' => $scenarios];
    }

    /** POST /api/admin/ai/scenarios/create */
    public function createScenario(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $fields = $this->validateScenario($data, true);
        if (isset($fields['error'])) {
            return $fields;
        }

        $exists = $this->db->prepare('SELECT id FROM ai_intent WHERE name = ?');
        $exists->execute([$fields['name']]);
        if ($exists->fetchColumn() !== false) {
            return ['success' => false, 'error' => 'A scenario with that name already exists.'];
        }

        $stmt = $this->db->prepare(
            'INSERT INTO ai_intent (name, description, priority, is_active, created_at)
             VALUES (?, ?, ?, ?, NOW())'
        );
        $stmt->execute([
            $fields['name'],
            $fields['description'],
            $fields['priority'],
            $fields['is_active'],
        ]);
        $id = (int) $this->db->lastInsertId();

        if (isset($fields['keywords'])) {
            $this->replaceKeywords($id, $fields['keywords']);
        }

        return ['success' => true, 'message' => 'Scenario created.', 'scenario' => $this->fetchScenario($id)];
    }

    /** POST /api/admin/ai/scenarios/update */
    public function updateScenario(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid scenario id is required.'];
        }

        $current = $this->fetchScenarioRow($id);
        if ($current === null) {
            return ['success' => false, 'error' => 'Scenario not found.', 'status' => 404];
        }

        $fields = $this->validateScenario($data, false);
        if (isset($fields['error'])) {
            return $fields;
        }

        // Renaming a built-in would break the match between the row and the
        // flow AiChatController runs for it.
        if (isset($fields['name'])
            && $fields['name'] !== $current['name']
            && $this->isBuiltIn($current['name'])
        ) {
            return [
                'success' => false,
                'error'   => 'A built-in scenario cannot be renamed. You can edit its description, keywords, priority, or disable it.',
                'status'  => 403,
            ];
        }

        if (isset($fields['name']) && $fields['name'] !== $current['name']) {
            $dup = $this->db->prepare('SELECT id FROM ai_intent WHERE name = ? AND id <> ?');
            $dup->execute([$fields['name'], $id]);
            if ($dup->fetchColumn() !== false) {
                return ['success' => false, 'error' => 'A scenario with that name already exists.'];
            }
        }

        $columns = [];
        $values  = [];
        foreach (['name', 'description', 'priority', 'is_active'] as $col) {
            if (array_key_exists($col, $fields)) {
                $columns[] = "{$col} = ?";
                $values[]  = $fields[$col];
            }
        }

        if ($columns !== []) {
            $values[] = $id;
            $this->db
                ->prepare('UPDATE ai_intent SET ' . implode(', ', $columns) . ' WHERE id = ?')
                ->execute($values);
        }

        if (isset($fields['keywords'])) {
            $this->replaceKeywords($id, $fields['keywords']);
        }

        return ['success' => true, 'message' => 'Scenario updated.', 'scenario' => $this->fetchScenario($id)];
    }

    /** POST /api/admin/ai/scenarios/toggle   { id } */
    public function toggleScenario(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid scenario id is required.'];
        }
        if ($this->fetchScenarioRow($id) === null) {
            return ['success' => false, 'error' => 'Scenario not found.', 'status' => 404];
        }

        $this->db->prepare('UPDATE ai_intent SET is_active = 1 - is_active WHERE id = ?')->execute([$id]);
        $scenario = $this->fetchScenario($id);

        return [
            'success'  => true,
            'message'  => $scenario['isActive'] ? 'Scenario activated.' : 'Scenario deactivated.',
            'scenario' => $scenario,
        ];
    }

    /** POST /api/admin/ai/scenarios/delete   { id } */
    public function deleteScenario(array $data): array
    {
        $adminId = $this->requireAdmin();
        if (is_array($adminId)) {
            return $adminId;
        }

        $id = $this->cleanId($data['id'] ?? null);
        if ($id === null) {
            return ['success' => false, 'error' => 'A valid scenario id is required.'];
        }

        $row = $this->fetchScenarioRow($id);
        if ($row === null) {
            return ['success' => false, 'error' => 'Scenario not found.', 'status' => 404];
        }

        if ($this->isBuiltIn($row['name'])) {
            return [
                'success' => false,
                'error'   => 'This scenario is implemented by the assistant and cannot be deleted. Deactivate it instead.',
                'status'  => 403,
            ];
        }

        // ai_keyword cascades; faq.intent_id is ON DELETE SET NULL, so FAQs
        // survive with no scenario attached rather than disappearing.
        $this->db->prepare('DELETE FROM ai_intent WHERE id = ?')->execute([$id]);

        return ['success' => true, 'message' => 'Scenario deleted.', 'id' => $id];
    }

    // =========================================================================
    // Validation helpers
    // =========================================================================

    /** @return array Validated columns, or ['error' => ...] to return as-is. */
    private function validateFaq(array $data, bool $requireAll): array
    {
        $out = [];

        if ($requireAll || array_key_exists('question', $data)) {
            $question = trim((string) ($data['question'] ?? ''));
            if ($question === '') {
                return ['success' => false, 'error' => 'Question is required.'];
            }
            if (mb_strlen($question) > self::MAX_QUESTION_LENGTH) {
                return ['success' => false, 'error' => 'Question must be ' . self::MAX_QUESTION_LENGTH . ' characters or fewer.'];
            }
            $out['question'] = $question;
        }

        if ($requireAll || array_key_exists('answer', $data)) {
            $answer = trim((string) ($data['answer'] ?? ''));
            if ($answer === '') {
                return ['success' => false, 'error' => 'Answer is required.'];
            }
            if (mb_strlen($answer) > self::MAX_ANSWER_LENGTH) {
                return ['success' => false, 'error' => 'Answer must be ' . self::MAX_ANSWER_LENGTH . ' characters or fewer.'];
            }
            $out['answer'] = $answer;
        }

        if ($requireAll || array_key_exists('category', $data)) {
            $category = trim((string) ($data['category'] ?? 'general'));
            if ($category === '') {
                $category = 'general';
            }
            if (mb_strlen($category) > self::MAX_CATEGORY_LENGTH) {
                return ['success' => false, 'error' => 'Category must be ' . self::MAX_CATEGORY_LENGTH . ' characters or fewer.'];
            }
            $out['category'] = $category;
        }

        if ($requireAll || array_key_exists('isActive', $data)) {
            $out['is_active'] = !empty($data['isActive']) || ($requireAll && !array_key_exists('isActive', $data)) ? 1 : 0;
        }

        if ($requireAll || array_key_exists('sortOrder', $data)) {
            $sort = $data['sortOrder'] ?? 0;
            if (!is_int($sort) && !(is_string($sort) && ctype_digit($sort))) {
                $sort = 0;
            }
            $out['sort_order'] = (int) $sort;
        }

        if (array_key_exists('intentId', $data)) {
            $intentId = $data['intentId'];
            if ($intentId === null || $intentId === '' || $intentId === 'none') {
                $out['intent_id'] = null;
            } else {
                $clean = $this->cleanId($intentId);
                if ($clean === null) {
                    return ['success' => false, 'error' => 'intentId must be a valid scenario id.'];
                }
                $check = $this->db->prepare('SELECT id FROM ai_intent WHERE id = ?');
                $check->execute([$clean]);
                if ($check->fetchColumn() === false) {
                    return ['success' => false, 'error' => 'That scenario does not exist.'];
                }
                $out['intent_id'] = $clean;
            }
        } elseif ($requireAll) {
            $out['intent_id'] = null;
        }

        return $out;
    }

    /** @return array Validated columns, or ['error' => ...] to return as-is. */
    private function validateScenario(array $data, bool $requireAll): array
    {
        $out = [];

        if ($requireAll || array_key_exists('name', $data)) {
            $name = strtolower(trim((string) ($data['name'] ?? '')));
            if ($name === '') {
                return ['success' => false, 'error' => 'Scenario name is required.'];
            }
            if (mb_strlen($name) > self::MAX_INTENT_NAME_LENGTH) {
                return ['success' => false, 'error' => 'Name must be ' . self::MAX_INTENT_NAME_LENGTH . ' characters or fewer.'];
            }
            // Kept machine-readable so a name can be matched against code.
            if (!preg_match('/^[a-z0-9_]+$/', $name)) {
                return [
                    'success' => false,
                    'error'   => 'Name may contain only lowercase letters, numbers and underscores (e.g. book_appointment).',
                ];
            }
            $out['name'] = $name;
        }

        if ($requireAll || array_key_exists('description', $data)) {
            $description = trim((string) ($data['description'] ?? ''));
            if (mb_strlen($description) > self::MAX_TEXT_LENGTH) {
                return ['success' => false, 'error' => 'Description must be ' . self::MAX_TEXT_LENGTH . ' characters or fewer.'];
            }
            $out['description'] = $description === '' ? null : $description;
        }

        if ($requireAll || array_key_exists('priority', $data)) {
            $priority = $data['priority'] ?? 10;
            if (!is_int($priority) && !(is_string($priority) && ctype_digit($priority))) {
                return ['success' => false, 'error' => 'Priority must be a number between 1 and 100.'];
            }
            $priority = (int) $priority;
            if ($priority < 1 || $priority > 100) {
                return ['success' => false, 'error' => 'Priority must be between 1 and 100.'];
            }
            $out['priority'] = $priority;
        }

        if ($requireAll || array_key_exists('isActive', $data)) {
            $out['is_active'] = !empty($data['isActive']) || ($requireAll && !array_key_exists('isActive', $data)) ? 1 : 0;
        }

        if (array_key_exists('keywords', $data)) {
            $keywords = $data['keywords'];
            if (is_string($keywords)) {
                $keywords = explode(',', $keywords);
            }
            if (!is_array($keywords)) {
                return ['success' => false, 'error' => 'Keywords must be a list.'];
            }

            $clean = [];
            foreach ($keywords as $kw) {
                if (!is_string($kw)) {
                    continue;
                }
                $kw = mb_strtolower(trim($kw));
                if ($kw === '' || mb_strlen($kw) > 200) {
                    continue;
                }
                $clean[$kw] = true; // de-duplicate; the table has a unique index
            }
            $out['keywords'] = array_keys($clean);
        }

        return $out;
    }

    // =========================================================================
    // Internals
    // =========================================================================

    /**
     * Scenarios that AiChatController actually implements.
     *
     * These names are the contract between the ai_intent rows and the code, so
     * they can be disabled but never renamed or removed.
     */
    private function isBuiltIn(string $name): bool
    {
        return in_array($name, [
            'book_appointment',
            'cancel_appointment',
            'document_request',
            'live_chat',
            'unknown',
        ], true);
    }

    /** @return array<string,string> */
    private function readSettings(): array
    {
        $rows = $this->db->query('SELECT setting_key, setting_value FROM ai_setting')->fetchAll();

        $out = [];
        foreach ($rows as $row) {
            $out[$row['setting_key']] = $row['setting_value'];
        }

        return $out;
    }

    private function shapeFaq(array $r): array
    {
        return [
            'id'         => (int) $r['id'],
            'intentId'   => $r['intent_id'] !== null ? (int) $r['intent_id'] : null,
            'intentName' => $r['intent_name'] ?? null,
            'question'   => $r['question'],
            'answer'     => $r['answer'],
            'category'   => $r['category'],
            'isActive'   => (bool) $r['is_active'],
            'sortOrder'  => (int) $r['sort_order'],
            'createdAt'  => $r['created_at'],
            'updatedAt'  => $r['updated_at'],
        ];
    }

    private function fetchFaq(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT f.*, i.name AS intent_name
               FROM faq f
               LEFT JOIN ai_intent i ON i.id = f.intent_id
              WHERE f.id = ?"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row !== false ? $this->shapeFaq($row) : null;
    }

    private function fetchScenarioRow(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_intent WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    private function fetchScenario(int $id): ?array
    {
        $row = $this->fetchScenarioRow($id);
        if ($row === null) {
            return null;
        }

        return [
            'id'           => (int) $row['id'],
            'name'         => $row['name'],
            'description'  => $row['description'],
            'priority'     => (int) $row['priority'],
            'isActive'     => (bool) $row['is_active'],
            'keywords'     => $this->keywordsFor($id),
            'keywordCount' => count($this->keywordsFor($id)),
            'faqCount'     => 0,
            'isBuiltIn'    => $this->isBuiltIn($row['name']),
            'createdAt'    => $row['created_at'],
            'updatedAt'    => $row['updated_at'],
        ];
    }

    /** @return list<string> */
    private function keywordsFor(int $intentId): array
    {
        $stmt = $this->db->prepare(
            'SELECT keyword FROM ai_keyword WHERE intent_id = ? ORDER BY keyword ASC'
        );
        $stmt->execute([$intentId]);

        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    /** @param list<string> $keywords */
    private function replaceKeywords(int $intentId, array $keywords): void
    {
        $this->db->prepare('DELETE FROM ai_keyword WHERE intent_id = ?')->execute([$intentId]);

        if ($keywords === []) {
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO ai_keyword (keyword, intent_id, created_at) VALUES (?, ?, NOW())'
        );
        foreach ($keywords as $keyword) {
            $stmt->execute([$keyword, $intentId]);
        }
    }

    private function label(string $key): string
    {
        return ucfirst(str_replace('_', ' ', $key));
    }

    private function cleanId($value): ?int
    {
        if (is_int($value) && $value > 0) {
            return $value;
        }
        if (is_string($value) && ctype_digit($value) && (int) $value > 0) {
            return (int) $value;
        }

        return null;
    }

    private function geminiKeyPresent(): bool
    {
        $key = $this->env('GEMINI_API_KEY');

        return is_string($key) && $key !== '';
    }

    /** Same .env reader AiChatController uses, so both see one configuration. */
    private function env(string $name): ?string
    {
        $value = $_ENV[$name] ?? getenv($name);
        if (is_string($value) && $value !== '') {
            return $value;
        }

        $path = dirname(__DIR__) . '/.env';
        if (!is_readable($path)) {
            return null;
        }

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            if (str_starts_with(ltrim($line), '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $raw] = explode('=', $line, 2);
            if (trim($key) !== $name) {
                continue;
            }
            $value = trim($raw);
            if (strlen($value) >= 2 && $value[0] === '"' && substr($value, -1) === '"') {
                $value = substr($value, 1, -1);
            }

            return $value !== '' ? $value : null;
        }

        return null;
    }

    // =========================================================================
    // Auth
    // =========================================================================

    /** @return int|array The admin's id, or an error array to return as-is. */
    private function requireAdmin()
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $stmt = $this->db->prepare(
            "SELECT roles FROM `user`
              WHERE id = ? AND deleted_at IS NULL AND status = 'active'"
        );
        $stmt->execute([(int) $m[1]]);
        $roles = $stmt->fetchColumn();

        if ($roles === false) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }

        $decoded = json_decode((string) $roles, true);
        if (!is_array($decoded) || !in_array('ROLE_ADMIN', $decoded, true)) {
            return ['success' => false, 'error' => 'Administrator access required.', 'status' => 403];
        }

        return (int) $m[1];
    }
}

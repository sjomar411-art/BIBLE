<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
$userId = require_login();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $stmt = db()->prepare('SELECT id, query, preview, type, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
    $stmt->execute([$userId]);
    respond(['history' => $stmt->fetchAll()]);
}
if ($method === 'POST') {
    $input = json_input();
    $query = trim((string)($input['query'] ?? ''));
    $preview = trim((string)($input['preview'] ?? ''));
    $type = (string)($input['type'] ?? 'reference');
    if ($query === '') respond(['error' => 'Search query is required.'], 422);
    if (!in_array($type, ['reference', 'keyword'], true)) $type = 'reference';
    $stmt = db()->prepare('INSERT INTO search_history (user_id, query, preview, type) VALUES (?, ?, ?, ?)');
    $stmt->execute([$userId, mb_substr($query, 0, 250), mb_substr($preview, 0, 500), $type]);
    respond(['ok' => true], 201);
}
require_post_or_delete(['GET', 'POST']);

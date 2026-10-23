<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
$userId = require_login();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $stmt = db()->prepare('SELECT id, reference, verse_text, translation, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    respond(['favorites' => $stmt->fetchAll()]);
}
if ($method === 'POST') {
    $input = json_input();
    $reference = trim((string)($input['reference'] ?? ''));
    $text = trim((string)($input['verse_text'] ?? ''));
    $translation = trim((string)($input['translation'] ?? 'WEB'));
    if ($reference === '' || $text === '') respond(['error' => 'Reference and verse text are required.'], 422);
    if (mb_strlen($reference) > 200 || mb_strlen($text) > 10000) respond(['error' => 'Verse data is too long.'], 422);
    $stmt = db()->prepare('INSERT INTO favorites (user_id, reference, verse_text, translation) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE verse_text = VALUES(verse_text), translation = VALUES(translation)');
    $stmt->execute([$userId, $reference, $text, $translation]);
    respond(['ok' => true], 201);
}
if ($method === 'DELETE') {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) respond(['error' => 'A valid favorite ID is required.'], 422);
    $stmt = db()->prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    respond(['ok' => true]);
}
require_post_or_delete(['GET', 'POST', 'DELETE']);

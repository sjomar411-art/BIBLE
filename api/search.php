<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require_login();

$q = trim((string)($_GET['q'] ?? ''));
if ($q === '') respond(['results' => []]);
if (mb_strlen($q) > 100) respond(['error' => 'Search term is too long.'], 422);

/*
 * Public keyword search API. This endpoint is third-party and may change/rate-limit.
 * The browser never constructs SQL from the search term.
 */
$url = 'https://search.getbible.net/v2/web/' . rawurlencode($q);
$context = stream_context_create(['http' => [
    'timeout' => 10,
    'ignore_errors' => true,
    'header' => "Accept: application/json\r\nUser-Agent: BibleSearchSystem/1.0\r\n"
]]);
$raw = @file_get_contents($url, false, $context);
if ($raw === false) respond(['error' => 'Keyword search service is unavailable. Try searching by Bible reference.'], 502);
$data = json_decode($raw, true);
if (!is_array($data)) respond(['error' => 'Keyword search returned an unexpected response.'], 502);
$rows = $data['results'] ?? $data['verses'] ?? $data;
if (!is_array($rows)) $rows = [];
$results = [];
foreach ($rows as $v) {
    if (!is_array($v)) continue;
    $reference = $v['reference'] ?? trim(($v['book_name'] ?? $v['book'] ?? '') . ' ' . ($v['chapter'] ?? '') . ':' . ($v['verse'] ?? ''));
    $text = $v['text'] ?? $v['verse_text'] ?? $v['content'] ?? '';
    if ($reference !== '' && $text !== '') {
        $results[] = ['reference' => (string)$reference, 'text' => (string)$text];
        if (count($results) >= 25) break;
    }
}
respond(['results' => $results]);

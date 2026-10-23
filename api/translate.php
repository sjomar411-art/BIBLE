<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require_login();
require_post_or_delete(['POST']);
$input = json_input();
$text = trim((string)($input['text'] ?? ''));
if ($text === '') respond(['error' => 'Text is required.'], 422);
if (mb_strlen($text) > 12000) respond(['error' => 'Passage is too long to translate in one request.'], 422);

/*
 * Machine translation only. This is not an official or verified Tagalog Bible edition.
 * For public deployment, review the provider's terms, privacy, rate limits, and licensing.
 */
$url = 'https://api.mymemory.translated.net/get?q=' . rawurlencode($text) . '&langpair=en|tl';
$context = stream_context_create(['http' => [
    'timeout' => 15,
    'ignore_errors' => true,
    'header' => "Accept: application/json\r\nUser-Agent: BibleSearchSystem/1.0\r\n"
]]);
$raw = @file_get_contents($url, false, $context);
if ($raw === false) respond(['error' => 'Translation service is unavailable.'], 502);
$data = json_decode($raw, true);
$translation = $data['responseData']['translatedText'] ?? '';
if (!is_string($translation) || $translation === '' || (int)($data['responseStatus'] ?? 200) >= 400) {
    respond(['error' => 'No Tagalog translation was returned.'], 502);
}
respond(['translation' => html_entity_decode($translation, ENT_QUOTES | ENT_HTML5, 'UTF-8')]);

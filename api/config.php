<?php
declare(strict_types=1);
session_start();

/*
 * Production: Supabase PostgreSQL
 * Credentials come from Vercel Environment Variables — never commit passwords!
 */

// Read from environment variables
$envHost = getenv('SUPABASE_HOST');
$envPort = getenv('SUPABASE_PORT') ?: '5432';
$envName = getenv('SUPABASE_DBNAME') ?: 'postgres';
$envUser = getenv('SUPABASE_USER') ?: 'postgres';
$envPass = getenv('SUPABASE_PASSWORD');

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    global $envHost, $envPort, $envName, $envUser, $envPass;

    $dsn = "pgsql:host=$envHost;port=$envPort;dbname=$envName;sslmode=require";

    $pdo = new PDO($dsn, $envUser, $envPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_input(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    
    // Allow cross-origin requests from your Vercel frontend
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Origin: https://bible-system.vercel.app'); // ← UPDATE THIS IF YOUR DOMAIN IS DIFFERENT
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_login(): int {
    if (empty($_SESSION['user_id'])) respond(['error' => 'Please sign in again.'], 401);
    return (int) $_SESSION['user_id'];
}

function require_post_or_delete(array $allowed): void {
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        respond(['error' => 'Method not allowed.'], 405);
    }
}
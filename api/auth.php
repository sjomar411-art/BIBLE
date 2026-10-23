<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
if ($action === 'me' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['user_id'])) respond(['user' => null]);
    $stmt = db()->prepare('SELECT id, email FROM users WHERE id = ?');
    $stmt->execute([(int) $_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) { session_destroy(); respond(['user' => null]); }
    respond(['user' => $user]);
}

require_post_or_delete(['POST']);
$input = json_input();
if ($action === 'signup') {
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $password = (string)($input['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Enter a valid email address.'], 422);
    if (strlen($password) < 8) respond(['error' => 'Password must be at least 8 characters.'], 422);
    if (strlen($password) > 4096) respond(['error' => 'Password is too long.'], 422);
    try {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = db()->prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
        $stmt->execute([$email, $hash]);
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)db()->lastInsertId();
        respond(['user' => ['id' => $_SESSION['user_id'], 'email' => $email]], 201);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') respond(['error' => 'An account with this email already exists.'], 409);
        error_log($e->getMessage());
        respond(['error' => 'Could not create account. Check that the database is configured.'], 500);
    }
}
if ($action === 'login') {
    $email = strtolower(trim((string)($input['email'] ?? '')));
    $password = (string)($input['password'] ?? '');
    $stmt = db()->prepare('SELECT id, email, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) respond(['error' => 'Email or password is incorrect.'], 401);
    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $update = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $update->execute([$newHash, $user['id']]);
    }
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    respond(['user' => ['id' => (int)$user['id'], 'email' => $user['email']]]);
}
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    respond(['ok' => true]);
}
respond(['error' => 'Unknown authentication action.'], 404);

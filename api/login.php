<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['ok' => false, 'message' => 'Método no permitido'], 405);
}

$data = readJsonBody();
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if ($username === '' || $password === '') {
    jsonResponse(['ok' => false, 'message' => 'Usuario y contraseña son obligatorios'], 422);
}

$pdo = getDb();
$stmt = $pdo->prepare('SELECT id, nombre, username, password FROM usuarios WHERE username = :username LIMIT 1');
$stmt->execute(['username' => $username]);
$user = $stmt->fetch();

if (!$user || !verifyPassword($password, $user['password'])) {
    jsonResponse(['ok' => false, 'message' => 'Credenciales incorrectas'], 401);
}

startSession();
session_regenerate_id(true);

$_SESSION['user'] = [
    'id' => (int) $user['id'],
    'nombre' => $user['nombre'],
    'username' => $user['username'],
];

jsonResponse([
    'ok' => true,
    'user' => $_SESSION['user'],
]);

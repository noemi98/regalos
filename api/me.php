<?php

require_once __DIR__ . '/helpers.php';

startSession();

if (empty($_SESSION['user'])) {
    jsonResponse(['ok' => true, 'authenticated' => false]);
}

jsonResponse([
    'ok' => true,
    'authenticated' => true,
    'user' => $_SESSION['user'],
]);

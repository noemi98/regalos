<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $pdo = getDb();
    jsonResponse([
        'ok' => true,
        'showImagesForGuests' => getShowImagesForGuests($pdo),
    ]);
}

if ($method === 'POST') {
    requireAuth();
    $data = readJsonBody();
    $pdo = getDb();

    if (!array_key_exists('showImagesForGuests', $data)) {
        jsonResponse(['ok' => false, 'message' => 'Parámetro showImagesForGuests requerido'], 422);
    }

    $show = !empty($data['showImagesForGuests']);
    setShowImagesForGuests($pdo, $show);

    jsonResponse([
        'ok' => true,
        'showImagesForGuests' => $show,
    ]);
}

jsonResponse(['ok' => false, 'message' => 'Método no permitido'], 405);

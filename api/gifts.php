<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    startSession();
    $pdo = getDb();
    $onlyEnabled = empty($_SESSION['user']);
    $sql = 'SELECT r.*, u.nombre AS creador_nombre
            FROM regalos r
            LEFT JOIN usuarios u ON r.creado_por = u.id';
    if ($onlyEnabled) {
        $sql .= ' WHERE r.habilitado = 1';
    }
    $sql .= ' ORDER BY r.id ASC';
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    jsonResponse([
        'ok' => true,
        'gifts' => array_map('mapGiftRow', $rows),
    ]);
}

if ($method === 'POST') {
    $user = requireAuth();

    $isMultipart = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');
    $data = $isMultipart ? $_POST : readJsonBody();

    $id = (int) ($data['id'] ?? 0);
    $isUpdate = $id > 0;

    $nombre = trim($data['name'] ?? $data['nombre'] ?? '');
    $precio = $data['price'] ?? $data['precio'] ?? null;
    $imagenUrl = trim($data['imageUrl'] ?? $data['imagen_url'] ?? '');
    $urlCompra = trim($data['buyUrl'] ?? $data['url_compra'] ?? '#');
    $reservado = !empty($data['reserved'] ?? $data['reservado'] ?? false) ? 1 : 0;
    $habilitado = !empty($data['habilitado'] ?? $data['enabled'] ?? true) ? 1 : 0;
    $reservadoPor = trim($data['reservedBy'] ?? $data['reservado_por'] ?? '');
    if ($reservado && $reservadoPor === '') {
        $reservadoPor = $user['nombre'];
    }

    if ($nombre === '') {
        jsonResponse(['ok' => false, 'message' => 'El nombre del regalo es obligatorio'], 422);
    }

    if ($precio === null || $precio === '' || !is_numeric($precio)) {
        jsonResponse(['ok' => false, 'message' => 'El precio debe ser un número válido'], 422);
    }

    $pdo = getDb();

    if ($isUpdate) {
        $existingStmt = $pdo->prepare('SELECT * FROM regalos WHERE id = :id');
        $existingStmt->execute(['id' => $id]);
        $existing = $existingStmt->fetch();

        if (!$existing) {
            jsonResponse(['ok' => false, 'message' => 'Regalo no encontrado'], 404);
        }

        $imagenUrl = $existing['imagen_url'] ?? '';

        if (!empty($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
            $imagenUrl = saveUploadedImage($_FILES['image']);
        }

        $stmt = $pdo->prepare(
            'UPDATE regalos
             SET nombre = :nombre,
                 precio = :precio,
                 imagen_url = :imagen_url,
                 url_compra = :url_compra,
                 reservado = :reservado,
                 reservado_por = :reservado_por,
                 habilitado = :habilitado
             WHERE id = :id'
        );

        $stmt->execute([
            'id' => $id,
            'nombre' => $nombre,
            'precio' => round((float) $precio, 2),
            'imagen_url' => $imagenUrl !== '' ? $imagenUrl : null,
            'url_compra' => $urlCompra !== '' ? $urlCompra : '#',
            'reservado' => $reservado,
            'reservado_por' => $reservadoPor !== '' ? $reservadoPor : null,
            'habilitado' => $habilitado,
        ]);
    } else {
        if (!empty($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
            $imagenUrl = saveUploadedImage($_FILES['image']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO regalos (nombre, precio, imagen_url, url_compra, reservado, reservado_por, creado_por, habilitado)
             VALUES (:nombre, :precio, :imagen_url, :url_compra, :reservado, :reservado_por, :creado_por, :habilitado)'
        );

        $stmt->execute([
            'nombre' => $nombre,
            'precio' => round((float) $precio, 2),
            'imagen_url' => $imagenUrl !== '' ? $imagenUrl : null,
            'url_compra' => $urlCompra !== '' ? $urlCompra : '#',
            'reservado' => $reservado,
            'reservado_por' => $reservadoPor !== '' ? $reservadoPor : null,
            'creado_por' => $user['id'],
            'habilitado' => 1,
        ]);

        $id = (int) $pdo->lastInsertId();
    }

    $giftStmt = $pdo->prepare(
        'SELECT r.*, u.nombre AS creador_nombre
         FROM regalos r
         LEFT JOIN usuarios u ON r.creado_por = u.id
         WHERE r.id = :id'
    );
    $giftStmt->execute(['id' => $id]);
    $row = $giftStmt->fetch();

    jsonResponse([
        'ok' => true,
        'gift' => mapGiftRow($row),
    ], $isUpdate ? 200 : 201);
}

jsonResponse(['ok' => false, 'message' => 'Método no permitido'], 405);

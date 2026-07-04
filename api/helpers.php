<?php

require_once __DIR__ . '/config.php';

function startSession(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function requireAuth(): array
{
    startSession();

    if (empty($_SESSION['user'])) {
        jsonResponse(['ok' => false, 'message' => 'No autenticado'], 401);
    }

    return $_SESSION['user'];
}

function verifyPassword(string $plain, string $stored): bool
{
    if (str_starts_with($stored, '$2y$') || str_starts_with($stored, '$2a$') || str_starts_with($stored, '$argon2')) {
        return password_verify($plain, $stored);
    }

    return hash_equals($stored, $plain);
}

function mapGiftRow(array $row): array
{
    $images = [];

    if (!empty($row['imagen_url'])) {
        $images[] = resolveImageUrl($row['imagen_url']);
    }

    if (!empty($row['imagenes_extra'])) {
        $extra = json_decode($row['imagenes_extra'], true);
        if (is_array($extra)) {
            $images = array_merge($images, array_map('resolveImageUrl', $extra));
        }
    }

    if ($images === []) {
        $images[] = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&h=450&fit=crop';
    }

    return [
        'id' => (int) $row['id'],
        'name' => $row['nombre'],
        'price' => (float) $row['precio'],
        'enabled' => (bool) ($row['habilitado'] ?? 1),
        'reserved' => (bool) $row['reservado'],
        'reservedBy' => $row['reservado_por'],
        'creatorName' => $row['creador_nombre'] ?? null,
        'buyUrl' => $row['url_compra'] ?? '#',
        'imageUrl' => !empty($row['imagen_url']) ? resolveImageUrl($row['imagen_url']) : null,
        'images' => $images,
    ];
}

function resolveImageUrl(string $url): string
{
    if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://') || str_starts_with($url, '/')) {
        return $url;
    }

    return $url;
}

function saveUploadedImage(array $file): string
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['ok' => false, 'message' => 'Error al subir la imagen'], 422);
    }

    $maxSize = 5 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        jsonResponse(['ok' => false, 'message' => 'La imagen no puede superar 5 MB'], 422);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    if (!isset($allowed[$mime])) {
        jsonResponse(['ok' => false, 'message' => 'Formato no permitido. Usa JPG, PNG, GIF o WebP'], 422);
    }

    $uploadDir = dirname(__DIR__) . '/uploads';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
        jsonResponse(['ok' => false, 'message' => 'No se pudo crear la carpeta de imágenes'], 500);
    }

    $filename = uniqid('gift_', true) . '.' . $allowed[$mime];
    $destination = $uploadDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        jsonResponse(['ok' => false, 'message' => 'No se pudo guardar la imagen'], 500);
    }

    return 'uploads/' . $filename;
}

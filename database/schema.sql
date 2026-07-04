-- Base de datos: noec_gift
-- Ejecutar este script en MySQL antes de usar la aplicación

USE noec_gift;

-- Tabla de usuarios (si aún no existe)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de regalos
CREATE TABLE IF NOT EXISTS regalos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    imagen_url TEXT NULL,
    imagenes_extra JSON NULL COMMENT 'URLs adicionales para carrusel',
    url_compra VARCHAR(500) DEFAULT '#',
    reservado TINYINT(1) NOT NULL DEFAULT 0,
    habilitado TINYINT(1) NOT NULL DEFAULT 1,
    reservado_por VARCHAR(255) NULL,
    creado_por INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_regalos_usuario
        FOREIGN KEY (creado_por) REFERENCES usuarios(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario de ejemplo (password: admin123)
-- La contraseña está hasheada con bcrypt
INSERT INTO usuarios (nombre, username, password)
SELECT 'Administrador', 'admin', '$2y$10$Ci19JLGy1N4RSIx/uINl3e/wDf5Tw3ayIEydpO9lIKuvqR/8HugYK'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE username = 'admin');

-- Regalos de ejemplo
INSERT INTO regalos (nombre, precio, imagen_url, url_compra, reservado, reservado_por)
SELECT * FROM (
    SELECT
        'Mochila' AS nombre,
        120.00 AS precio,
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=450&fit=crop' AS imagen_url,
        '#' AS url_compra,
        1 AS reservado,
        'Spiderman 🕷️' AS reservado_por
    UNION ALL
    SELECT 'Lonchera', 99.00, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=450&fit=crop', '#', 0, NULL
    UNION ALL
    SELECT 'Audífonos', 163.37, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=450&fit=crop', '#', 0, NULL
    UNION ALL
    SELECT 'Cargador', 126.00, 'https://images.unsplash.com/photo-1583863783234-869e27e97c8d?w=600&h=450&fit=crop', '#', 0, NULL
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM regalos LIMIT 1);

CREATE TABLE books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    path TEXT NOT NULL,
    cover_path TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reading_state (
    book_id TEXT PRIMARY KEY,
    position TEXT,
    scroll_percentage REAL DEFAULT 0.0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(book_id) REFERENCES books(id)
);

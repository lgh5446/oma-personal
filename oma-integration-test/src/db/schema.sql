-- Todo App Database Schema
-- Target: SQLite

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  done BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO todos (title, done) VALUES ('프로젝트 설계', 0);
INSERT INTO todos (title, done) VALUES ('코드 리뷰', 1);
INSERT INTO todos (title, done) VALUES ('테스트 작성', 0);

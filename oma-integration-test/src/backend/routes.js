const express = require('express');
const router = express.Router();

// In-memory storage (simplified)
let todos = [
  { id: 1, title: '프로젝트 설계', done: false },
  { id: 2, title: '코드 리뷰', done: true }
];
let nextId = 3;

function escapeHtml(value) {
  return value.replace(/[&<>"'`]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  }[char]));
}

function sanitizeTitle(input) {
  if (typeof input !== 'string') return null;

  const title = input.trim();
  if (!title) return null;

  return escapeHtml(title);
}

function parseTodoId(input) {
  const id = Number(input);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

// GET all todos
router.get('/todos', (req, res) => {
  res.json(todos);
});

// POST new todo
router.post('/todos', (req, res) => {
  const title = sanitizeTitle(req.body.title);
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const todo = {
    id: nextId++,
    title,
    done: false
  };
  todos.push(todo);
  res.status(201).json(todo);
});

// PATCH toggle todo
router.patch('/todos/:id/toggle', (req, res) => {
  const id = parseTodoId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid todo id' });

  const todo = todos.find(t => t.id === id);
  if (!todo) return res.status(404).json({ error: 'Not found' });
  todo.done = !todo.done;
  res.json(todo);
});

// DELETE todo
// BUG: No authorization check
router.delete('/todos/:id', (req, res) => {
  const id = parseTodoId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid todo id' });

  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  todos.splice(index, 1);
  res.status(204).send();
});

module.exports = router;

const API_URL = 'http://localhost:3000/api/todos';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const totalCount = document.getElementById('total-count');
const doneCount = document.getElementById('done-count');

let todos = [];

async function loadTodos() {
  const res = await fetch(API_URL);
  todos = await res.json();
  renderTodos();
}

function renderTodos() {
  list.innerHTML = '';
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = todo.done ? 'done' : '';
    li.innerHTML = `
      <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
      <span>${todo.title}</span>
      <button class="delete-btn" onclick="deleteTodo(${todo.id})">삭제</button>
    `;
    list.appendChild(li);
  });
  totalCount.textContent = `총 ${todos.length}개`;
  doneCount.textContent = `완료 ${todos.filter(t => t.done).length}개`;
}

async function addTodo(title) {
  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  loadTodos();
}

async function toggleTodo(id) {
  await fetch(`${API_URL}/${id}/toggle`, { method: 'PATCH' });
  loadTodos();
}

async function deleteTodo(id) {
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  loadTodos();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (title) {
    addTodo(title);
    input.value = '';
  }
});

loadTodos();

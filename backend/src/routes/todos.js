import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../config.js';
import { putItem, getItem, queryByUser, updateItem, deleteItem } from '../utils/dynamodb.js';
import { sendTaskNotification } from '../utils/sqs.js';
import { buildTodoUpdate } from '../utils/todoUpdate.js';
import { asyncRoute } from '../utils/http.js';

const router = express.Router();

function matchesFilters(item, { status, priority, search }) {
  if (status && item.status !== status) return false;
  if (priority && item.priority !== priority) return false;
  if (search) {
    const searchLower = search.toLowerCase();
    return item.title.toLowerCase().includes(searchLower) || item.description.toLowerCase().includes(searchLower);
  }
  return true;
}

async function findTodo(req, res) {
  const todo = await getItem(TABLES.todos, { userId: req.user.userId, todoId: req.params.todoId });
  if (!todo) {
    res.status(404).json({ error: 'Todo not found' });
  }
  return todo;
}

router.post('/', asyncRoute('Create todo error', 'Failed to create todo', async (req, res) => {
  const { title, description = '', status = 'pending', priority = 'medium' } = req.body;
  const userId = req.user.userId;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const todoId = uuidv4();
  const now = new Date().toISOString();
  const todo = {
    userId,
    todoId,
    title,
    description,
    status,
    priority,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    id: todoId,
  };

  await putItem(TABLES.todos, todo);
  await sendTaskNotification('todo_created', userId, todoId, 'create', { title });

  res.status(201).json(todo);
}));

router.get('/', asyncRoute('Get todos error', 'Failed to get todos', async (req, res) => {
  const items = await queryByUser(TABLES.todos, req.user.userId);
  res.json(items.filter((item) => matchesFilters(item, req.query)));
}));

router.get('/:todoId', asyncRoute('Get todo error', 'Failed to get todo', async (req, res) => {
  const todo = await findTodo(req, res);
  if (todo) res.json(todo);
}));

router.put('/:todoId', asyncRoute('Update todo error', 'Failed to update todo', async (req, res) => {
  const existing = await findTodo(req, res);
  if (!existing) return;

  const { userId } = req.user;
  const { todoId } = req.params;
  const { updateExpression, values, names } = buildTodoUpdate(existing, req.body);
  const updated = await updateItem(TABLES.todos, { userId, todoId }, updateExpression, values, names);

  await sendTaskNotification('todo_updated', userId, todoId, 'update', { title: req.body.title || existing.title });

  res.json(updated);
}));

router.delete('/:todoId', asyncRoute('Delete todo error', 'Failed to delete todo', async (req, res) => {
  const existing = await findTodo(req, res);
  if (!existing) return;

  const { userId } = req.user;
  const { todoId } = req.params;
  await deleteItem(TABLES.todos, { userId, todoId });
  await sendTaskNotification('todo_deleted', userId, todoId, 'delete', { title: existing.title });

  res.status(204).end();
}));

export default router;

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '../utils/dynamodb.js';
import { sendTaskNotification } from '../utils/sqs.js';

const router = express.Router();
const TABLE_NAME = 'Todos';

function generateTodoId() {
  return uuidv4();
}

// Create todo
router.post('/', async (req, res) => {
  try {
    const { title, description = '', status = 'pending', priority = 'medium' } = req.body;
    const userId = req.user.userId;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const todoId = generateTodoId();
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
    };
    
    await putItem(TABLE_NAME, todo);
    await sendTaskNotification('todo_created', userId, todoId, 'create', { title });
    
    res.json(todo);
  } catch (error) {
    console.error('Create todo error:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Get todos
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, priority, search } = req.query;
    
    let items = await queryItems(TABLE_NAME, 'userId = :userId', { ':userId': userId });
    
    if (status) {
      items = items.filter(item => item.status === status);
    }
    
    if (priority) {
      items = items.filter(item => item.priority === priority);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchLower) || 
        item.description.toLowerCase().includes(searchLower)
      );
    }
    
    res.json(items);
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({ error: 'Failed to get todos' });
  }
});

// Get single todo
router.get('/:todoId', async (req, res) => {
  try {
    const { todoId } = req.params;
    const userId = req.user.userId;
    
    const todo = await getItem(TABLE_NAME, { userId, todoId });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    res.json(todo);
  } catch (error) {
    console.error('Get todo error:', error);
    res.status(500).json({ error: 'Failed to get todo' });
  }
});

// Update todo
router.put('/:todoId', async (req, res) => {
  try {
    const { todoId } = req.params;
    const userId = req.user.userId;
    const { title, description, status, priority } = req.body;
    
    const existing = await getItem(TABLE_NAME, { userId, todoId });
    if (!existing) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    let updateExpression = 'SET updatedAt = :now';
    const values = { ':now': new Date().toISOString() };
    const names = {};
    
    if (title !== undefined) {
      updateExpression += ', title = :title';
      values[':title'] = title;
    }
    
    if (description !== undefined) {
      updateExpression += ', description = :description';
      values[':description'] = description;
    }
    
    if (status !== undefined) {
      updateExpression += ', #status = :status';
      values[':status'] = status;
      names['#status'] = 'status';
      
      if (status === 'completed' && existing.status !== 'completed') {
        updateExpression += ', completedAt = :completedAt';
        values[':completedAt'] = new Date().toISOString();
      }
    }
    
    if (priority !== undefined) {
      updateExpression += ', priority = :priority';
      values[':priority'] = priority;
    }
    
    const updated = await updateItem(TABLE_NAME, { userId, todoId }, updateExpression, values, names);
    
    await sendTaskNotification('todo_updated', userId, todoId, 'update', { title: title || existing.title });
    
    res.json(updated);
  } catch (error) {
    console.error('Update todo error:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Delete todo
router.delete('/:todoId', async (req, res) => {
  try {
    const { todoId } = req.params;
    const userId = req.user.userId;
    
    const existing = await getItem(TABLE_NAME, { userId, todoId });
    if (!existing) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    await deleteItem(TABLE_NAME, { userId, todoId });
    await sendTaskNotification('todo_deleted', userId, todoId, 'delete', { title: existing.title });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default router;

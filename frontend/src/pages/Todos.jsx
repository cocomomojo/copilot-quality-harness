import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useApp } from '../context/AppContext.jsx';
import './Todos.css';

function Todos() {
  const { showToast } = useApp();
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTodos();
  }, [statusFilter, priorityFilter, searchQuery]);

  const loadTodos = async () => {
    try {
      setIsLoading(true);
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (searchQuery) filters.search = searchQuery;

      const data = await api.todos.list(filters);
      setTodos(data || []);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const createTodo = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await api.todos.create(newTitle, newDescription, 'pending', 'medium');
      setNewTitle('');
      setNewDescription('');
      showToast('TODO created successfully', 'success');
      await loadTodos();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const updateTodoStatus = async (todoId, newStatus) => {
    try {
      await api.todos.update(todoId, { status: newStatus });
      showToast('TODO updated successfully', 'success');
      await loadTodos();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const deleteTodo = async (todoId) => {
    if (!window.confirm('Are you sure you want to delete this TODO?')) return;

    try {
      await api.todos.delete(todoId);
      showToast('TODO deleted successfully', 'success');
      await loadTodos();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  return (
    <main className="todos-page" data-testid="todos-page">
      <header className="page-header">
        <h1>TODO Management</h1>
      </header>

      <section className="create-todo-section">
        <h2>Create New TODO</h2>
        <form onSubmit={createTodo} className="create-form">
          <input
            data-testid="todo-title-input"
            type="text"
            placeholder="TODO title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="form-input"
          />
          <textarea
            data-testid="todo-description-input"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="form-textarea"
            rows="3"
          />
          <button type="submit" data-testid="todo-create-button" className="btn btn-primary">
            Add TODO
          </button>
        </form>
      </section>

      <section className="filters-section">
        <h2>Filters</h2>
        <div className="filters">
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search TODOs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
          <select
            data-testid="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            data-testid="filter-priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="form-select"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </section>

      <section className="todos-list-section">
        <h2>TODOs</h2>
        {isLoading ? (
          <p>Loading TODOs...</p>
        ) : todos.length === 0 ? (
          <p className="empty-message">No TODOs found</p>
        ) : (
          <div className="todos-list">
            {todos.map((todo) => (
              <div key={todo.todoId} className="todo-item" data-testid={`todo-item-${todo.todoId}`}>
                <div className="todo-content">
                  <h3>{todo.title}</h3>
                  {todo.description && <p>{todo.description}</p>}
                  <div className="todo-meta">
                    <span className="badge status-badge">{todo.status}</span>
                    <span className="badge priority-badge">{todo.priority}</span>
                  </div>
                </div>
                <div className="todo-actions">
                  <select
                    data-testid={`todo-status-select-${todo.todoId}`}
                    value={todo.status}
                    onChange={(e) => updateTodoStatus(todo.todoId, e.target.value)}
                    className="form-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    data-testid={`todo-delete-button-${todo.todoId}`}
                    onClick={() => deleteTodo(todo.todoId)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Todos;

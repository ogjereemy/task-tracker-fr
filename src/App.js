import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://task-tracker-xywd.onrender.com/tasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const addMessage = (text, type = 'success') => {
    const id = Date.now();
    setMessages((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 3000);
  };

  const formatDate = (dateString) => {
    // Parse dateString as UTC
    const date = new Date(dateString + (dateString.endsWith('Z') ? '' : 'Z'));
    // Get local date components
    const localYear = date.getFullYear();
    const localMonth = date.getMonth();
    const localDay = date.getDate();
    // Create a local date at midnight
    const localDate = new Date(localYear, localMonth, localDay);

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterday = new Date(todayStart);
    yesterday.setDate(todayStart.getDate() - 1);

    // Debug logging
    console.log('Task created_at:', dateString);
    console.log('Parsed local date:', localDate.toISOString());
    console.log('Today:', todayStart.toISOString());
    console.log('Yesterday:', yesterday.toISOString());

    const isToday = localDate.getTime() === todayStart.getTime();
    const isYesterday = localDate.getTime() === yesterday.getTime();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    // Format as YYYY-MM-DD
    return `${localYear}-${String(localMonth + 1).padStart(2, '0')}-${String(localDay).padStart(2, '0')}`;
  };

  const groupTasksByDay = (tasks) => {
    const grouped = {};
    tasks.forEach((task) => {
      const day = formatDate(task.created_at);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(task);
    });
    return Object.entries(grouped).sort(([a], [b]) => {
      if (a === 'Today') return -1;
      if (b === 'Today') return 1;
      if (a === 'Yesterday') return -1;
      if (b === 'Yesterday') return 1;
      return b.localeCompare(a); // Sort by date descending
    });
  };

  const toggleSection = (day) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(API_URL);
      setTasks(res.data);
    } catch (error) {
      addMessage(error.response?.data?.error || 'Failed to fetch tasks', 'error');
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!title) {
      addMessage('Task title cannot be empty', 'error');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await axios.post(API_URL, { title });
      setTasks((prev) => [...prev, res.data.task]);
      setTitle('');
      addMessage(res.data.message);
    } catch (error) {
      addMessage(error.response?.data?.error || 'Failed to add task', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (id) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await axios.delete(`${API_URL}/${id}`);
      setTasks((prev) => prev.filter((task) => task.id !== id));
      addMessage(res.data.message);
    } catch (error) {
      addMessage(error.response?.data?.error || 'Failed to delete task', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = async (id, completed) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await axios.patch(`${API_URL}/${id}`, { completed: !completed });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, completed: !completed } : task
        )
      );
      addMessage(res.data.message);
    } catch (error) {
      addMessage(error.response?.data?.error || 'Failed to update task', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const saveEdit = async (id) => {
    if (!editTitle) {
      addMessage('Task title cannot be empty', 'error');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await axios.put(`${API_URL}/${id}`, { title: editTitle });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, title: editTitle } : task
        )
      );
      setEditingId(null);
      setEditTitle('');
      addMessage(res.data.message);
    } catch (error) {
      addMessage(error.response?.data?.error || 'Failed to update task', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const groupedTasks = groupTasksByDay(tasks);

  return (
    <div className="app-container">
      <h1 className="app-title">Task Tracker</h1>

      <div className="message-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message message-${msg.type}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={addTask} className="task-form">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new task..."
          className="task-input"
          disabled={isLoading}
        />
        <button type="submit" className="add-button" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      <div className="task-sections">
        {groupedTasks.length === 0 ? (
          <p className="no-tasks">No tasks yet. Add one to get started!</p>
        ) : (
          groupedTasks.map(([day, dayTasks]) => (
            <div key={day} className="task-section">
              <div
                className="section-header"
                onClick={() => toggleSection(day)}
              >
                <h2 className="section-title">{day}</h2>
                <span className={`toggle-icon ${collapsedSections[day] ? 'collapsed' : ''}`}>
                  ▼
                </span>
              </div>
              {!collapsedSections[day] && (
                <ul className="task-list">
                  {dayTasks.map((task) => (
                    <li key={task.id} className="task-item">
                      <div className="task-content">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTask(task.id, task.completed)}
                          className="task-checkbox"
                          disabled={isLoading}
                        />
                        {editingId === task.id ? (
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="edit-input"
                            disabled={isLoading}
                          />
                        ) : (
                          <span
                            className={`task-title ${
                              task.completed ? 'task-completed' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                        )}
                      </div>
                      <div className="task-actions">
                        {editingId === task.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(task.id)}
                              className="action-button save-button"
                              disabled={isLoading}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="action-button cancel-button"
                              disabled={isLoading}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(task)}
                              className="action-button edit-button"
                              disabled={isLoading}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="action-button delete-button"
                              disabled={isLoading}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
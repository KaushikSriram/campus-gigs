const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('campusgig_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export const api = {
  // Auth
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Tasks
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  getTask: (id) => request(`/tasks/${id}`),
  getMyTasks: () => request('/tasks/mine'),
  createTask: (body) => request('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  applyToTask: (id) => request(`/tasks/${id}/apply`, { method: 'POST' }),
  acceptApplicant: (taskId, appId) => request(`/tasks/${taskId}/accept/${appId}`, { method: 'POST' }),
  declineApplicant: (taskId, appId) => request(`/tasks/${taskId}/decline/${appId}`, { method: 'POST' }),
  completeTask: (id) => request(`/tasks/${id}/complete`, { method: 'POST' }),
  cancelApplication: (id) => request(`/tasks/${id}/cancel-application`, { method: 'POST' }),

  // Messages
  getThreads: () => request('/messages/threads'),
  getMessages: (taskId, userId) => request(`/messages/${taskId}/${userId}`),
  sendMessage: (taskId, userId, content) =>
    request(`/messages/${taskId}/${userId}`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Reviews
  submitReview: (body) => request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  getUserReviews: (userId) => request(`/reviews/user/${userId}`),
  getPendingReviews: () => request('/reviews/pending'),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // Safety
  reportUser: (body) => request('/safety/report', { method: 'POST', body: JSON.stringify(body) }),
  blockUser: (blockedId) => request('/safety/block', { method: 'POST', body: JSON.stringify({ blockedId }) }),
  unblockUser: (id) => request(`/safety/block/${id}`, { method: 'DELETE' }),

  // Users
  getUser: (id) => request(`/users/${id}`),

  // Categories
  getCategories: () => request('/categories'),
};

const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청 실패');
  return data;
}

export const auth = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
};

export const documents = {
  list: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/documents${q ? '?' + q : ''}`);
  },
  get: (id) => request(`/documents/${id}`),
  create: (body) => request('/documents', { method: 'POST', body: JSON.stringify(body) }),
  submit: (id, approver_id) =>
    request(`/documents/${id}/submit`, { method: 'PATCH', body: JSON.stringify({ approver_id }) }),
  approve: (id) => request(`/documents/${id}/approve`, { method: 'PATCH' }),
  reject: (id) => request(`/documents/${id}/reject`, { method: 'PATCH' }),
  delete: (id) => request(`/documents/${id}`, { method: 'DELETE' })
};

export const users = {
  approvers: () => request('/users/approvers'),
  list: () => request('/users'),
  create: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' })
};

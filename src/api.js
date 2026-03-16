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

async function requestWithForm(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청 실패');
  return data;
}

export const documents = {
  list: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/documents${q ? '?' + q : ''}`);
  },
  get: (id) => request(`/documents/${id}`),
  create: (body) => request('/documents', { method: 'POST', body: JSON.stringify(body) }),
  uploadAttachments: (id, files) => {
    const form = new FormData();
    for (const f of files) form.append('attachments', f);
    return requestWithForm(`/documents/${id}/attachments`, form);
  },
  downloadAttachment: async (docId, attachmentId, filename) => {
    const token = getToken();
    const res = await fetch(`${API}/documents/${docId}/attachments/${attachmentId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('다운로드 실패');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'download';
    a.click();
    URL.revokeObjectURL(a.href);
  },
  deleteAttachment: (docId, attachmentId) =>
    request(`/documents/${docId}/attachments/${attachmentId}`, { method: 'DELETE' }),
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

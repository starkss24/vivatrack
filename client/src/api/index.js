import { http } from './http';

const d = (p) => p.then((r) => r.data);

export const authApi = {
  login: (email, password) => d(http.post('/auth/login', { email, password })),
  logout: () => d(http.post('/auth/logout')),
  me: () => d(http.get('/auth/me')),
};

export const adminApi = {
  users: (role) => d(http.get('/admin/users', { params: { role } })),
  createUser: (body) => d(http.post('/admin/users', body)),
  courses: () => d(http.get('/admin/courses')),
  createCourse: (body) => d(http.post('/admin/courses', body)),
  updateCourse: (id, body) => d(http.patch(`/admin/courses/${id}`, body)),
  assignments: (courseId) => d(http.get('/admin/assignments', { params: { courseId } })),
  importAssignments: (courseId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return d(http.post('/admin/assignments/import', fd, { params: { courseId } }));
  },
  reassign: (id, taId) => d(http.patch(`/admin/assignments/${id}`, { taId })),
  pending: (courseId) => d(http.get('/admin/pending-report', { params: { courseId } })),
  exportGrades: (courseId) => http.get('/admin/export/grades', { params: { courseId }, responseType: 'blob' }),
  flags: (params) => d(http.get('/admin/flags', { params })),
  createFlag: (body) => d(http.post('/admin/flags', body)),
  resolveFlag: (id) => d(http.patch(`/admin/flags/${id}/resolve`)),
  issues: (status) => d(http.get('/admin/issues', { params: { status } })),
  issue: (id) => d(http.get(`/admin/issues/${id}`)),
  updateIssue: (id, body) => d(http.patch(`/admin/issues/${id}`, body)),
};

export const taApi = {
  courses: () => d(http.get('/ta/courses')),
  students: (courseId, session) => d(http.get(`/ta/courses/${courseId}/students`, { params: { session } })),
  saveRecord: (body) => d(http.put('/ta/records', body)),
  audit: (recordId) => d(http.get(`/ta/records/${recordId}/audit`)),
  flag: (body) => d(http.post('/ta/flags', body)),
  resolveFlag: (id) => d(http.patch(`/ta/flags/${id}/resolve`)),
};

export const studentApi = {
  courses: () => d(http.get('/student/courses')),
  dashboard: (courseId) => d(http.get(`/student/courses/${courseId}/dashboard`)),
  issues: () => d(http.get('/student/issues')),
  createIssue: (body) => d(http.post('/student/issues', body)),
};

export const chatApi = {
  conversations: (params) => d(http.get('/chat/conversations', { params })),
  messages: (params) => d(http.get('/chat/messages', { params })),
  send: (body) => d(http.post('/chat/messages', body)),
};

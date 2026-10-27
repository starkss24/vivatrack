import { adminApi } from '../../api';

export async function downloadGrades(course) {
  const res = await adminApi.exportGrades(course._id);
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${course.code}-grades.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

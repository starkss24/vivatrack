const { Assignment } = require('../models');

async function listCourses(ta) {
  const rows = await Assignment.aggregate([
    { $match: { ta: ta._id } },
    { $group: { _id: '$course', studentCount: { $sum: 1 } } },
    { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
    { $unwind: '$course' },
    { $sort: { 'course.name': 1 } },
  ]);
  return rows.map((r) => ({ course: r.course, studentCount: r.studentCount }));
}

module.exports = { listCourses };

const { Course, VivaRecord } = require('../models');
const { badRequest, conflict, notFound } = require('../utils/AppError');

async function createCourse(data) {
  const course = new Course({ ...data });
  if (course.currentSession > course.totalSessions) {
    throw badRequest(`currentSession cannot exceed totalSessions (${course.totalSessions})`);
  }
  try {
    return await course.save();
  } catch (e) {
    if (e.code === 11000) throw conflict('A course with this code already exists', undefined, 'COURSE_CODE_TAKEN');
    throw e;
  }
}

async function listCourses() {
  return Course.find().sort({ createdAt: -1 });
}

// Rule 2: currentSession is within [0, totalSessions]; it may be lowered only if no
// viva records exist above the new value.
async function updateCourse(id, patch) {
  const course = await Course.findById(id);
  if (!course) throw notFound('Course not found');

  const nextTotal = patch.totalSessions ?? course.totalSessions;
  const nextCurrent = patch.currentSession ?? course.currentSession;

  if (nextCurrent < 0 || nextCurrent > nextTotal) {
    throw badRequest(`Current session must be between 0 and ${nextTotal}`, undefined, 'SESSION_OUT_OF_RANGE');
  }

  if (patch.totalSessions !== undefined && patch.totalSessions < course.totalSessions) {
    const above = await VivaRecord.exists({ course: id, sessionNumber: { $gt: patch.totalSessions } });
    if (above) throw conflict(`Cannot reduce total sessions: records exist for later sessions`);
  }

  if (patch.currentSession !== undefined && patch.currentSession < course.currentSession) {
    const above = await VivaRecord.exists({ course: id, sessionNumber: { $gt: patch.currentSession } });
    if (above) {
      throw conflict(
        `Cannot move back to session ${patch.currentSession}: viva records already exist for a later session`,
        undefined,
        'RECORDS_EXIST_ABOVE'
      );
    }
  }

  if (patch.maxMarksPerViva !== undefined && patch.maxMarksPerViva < course.maxMarksPerViva) {
    const over = await VivaRecord.exists({ course: id, marks: { $gt: patch.maxMarksPerViva } });
    if (over) throw conflict('Cannot lower max marks: existing records have higher marks');
  }

  for (const k of ['name', 'totalSessions', 'currentSession', 'maxMarksPerViva']) {
    if (patch[k] !== undefined) course[k] = patch[k];
  }
  return course.save();
}

module.exports = { createCourse, listCourses, updateCourse };

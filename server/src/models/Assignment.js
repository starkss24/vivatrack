const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ta: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// A student has exactly one TA per course.
assignmentSchema.index({ course: 1, student: 1 }, { unique: true });
assignmentSchema.index({ course: 1, ta: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);

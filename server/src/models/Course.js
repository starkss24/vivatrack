const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    totalSessions: { type: Number, required: true, min: 1, validate: Number.isInteger },
    currentSession: {
      type: Number,
      default: 0,
      min: 0,
      validate: [
        { validator: Number.isInteger, message: 'currentSession must be an integer' },
        {
          validator(v) {
            return typeof this.totalSessions !== 'number' || v <= this.totalSessions;
          },
          message: 'currentSession cannot exceed totalSessions',
        },
      ],
    },
    maxMarksPerViva: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);

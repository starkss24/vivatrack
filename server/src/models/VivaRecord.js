const mongoose = require('mongoose');

const vivaRecordSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ta: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionNumber: { type: Number, required: true, min: 1, validate: Number.isInteger },
    attendance: { type: String, enum: ['present', 'absent'], required: true },
    marks: {
      type: Number,
      default: null,
      validate: {
        validator(v) {
          if (this.attendance === 'present') return typeof v === 'number';
          return v === null || v === undefined;
        },
        message: 'marks are required when present and must be empty when absent',
      },
    },
    remarks: { type: String, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

vivaRecordSchema.index({ course: 1, student: 1, sessionNumber: 1 }, { unique: true });
vivaRecordSchema.index({ course: 1, ta: 1 });

module.exports = mongoose.model('VivaRecord', vivaRecordSchema);

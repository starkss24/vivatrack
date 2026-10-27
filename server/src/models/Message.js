const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ta: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator(v) {
          return String(v) === String(this.student) || String(v) === String(this.ta);
        },
        message: 'sender must be the student or the TA of the conversation',
      },
    },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
    clientMessageId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ sender: 1, clientMessageId: 1 }, { unique: true });
messageSchema.index({ course: 1, student: 1, ta: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);

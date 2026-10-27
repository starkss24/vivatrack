import { useState } from 'react';
import { taApi } from '../../api';
import { errorMessage, fieldErrors } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Modal, inputCls } from '../../components/ui';

export default function FlagModal({ courseId, student, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { flag } = await taApi.flag({ courseId, studentId: student.id, reason });
      toast.success(`${student.name} flagged`);
      onDone({ id: flag._id, reason: flag.reason });
      onClose();
    } catch (e2) {
      setErr(fieldErrors(e2).reason || errorMessage(e2));
    } finally { setBusy(false); }
  };

  return (
    <Modal title={`Flag ${student.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Why does this student need attention?" error={err} hint={`${reason.length}/500 · visible to TAs and admin only, never to the student`}>
          <textarea className={inputCls} rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={!reason.trim()}>Flag student</Button>
        </div>
      </form>
    </Modal>
  );
}

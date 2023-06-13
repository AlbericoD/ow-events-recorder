import { createPortal } from 'react-dom';

import { RecordingHeader } from '../../constants/types';
import { classNames } from '../../utils';

import './DeleteModal.scss';

export type DeleteModalProps = {
  recording: RecordingHeader
  onConfirm(): void
  onCancel(): void
  className?: string
}

export function DeleteModal({
  recording,
  onConfirm,
  onCancel,
  className
}: DeleteModalProps) {

  const renderModal = () => (
    <div
      className={classNames('DeleteModal', className)}
      onClick={onCancel}
    >
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Delete «{recording.title}»?</h3>
        <p>Do you want to delete this recording?</p>
        <div className="actions">
          <button className="cta" onClick={onConfirm}>Delete</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );

  return createPortal(
    renderModal(),
    document.body,
    `DeleteModal-${recording.uid}`
  );
}

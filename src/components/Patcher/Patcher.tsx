import { useState, useEffect } from 'react';
import { debounce } from 'throttle-debounce';

import { eventBus } from '../../services/event-bus';
import { classNames } from '../../utils';

import './Patcher.scss';

export type PatcherProps = {
  className?: string
}

export function Patcher({ className }: PatcherProps) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutHandle: number | null = null;

    const handleFileDrop = (e: DragEvent) => {
      e.preventDefault();

      if (!e.dataTransfer || e.dataTransfer.files.length !== 1) {
        setDrag(false);
        return;
      }

      setDrag(false);

      const path = (e.dataTransfer.files[0] as any).path;

      console.log('handleFileDrop():', path);

      eventBus.emit('patchApp', path);
    };

    const cancelDragStatus = debounce(500, () => setDrag(false));

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDrag(true);
      cancelDragStatus();
    };

    const onPatchAppError = (message: string) => {
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }

      setError(message);

      timeoutHandle = window.setTimeout(() => setError(null), 5000);
    };

    document.body.addEventListener('drop', handleFileDrop);
    document.body.addEventListener('dragover', handleDragOver);
    eventBus.addListener('patchAppError', onPatchAppError);

    return () => {
      document.body.removeEventListener('drop', handleFileDrop);
      document.body.removeEventListener('dragover', handleDragOver);
      eventBus.removeListener('patchAppError', onPatchAppError);
    };
  }, []);

  return (
    <div
      className={classNames('Patcher', className, { 'drag-over': drag })}
      onClick={() => eventBus.emit('patchApp', undefined)}
    >
      {
        error
          ? <p className="error">{error}</p>
          : <p>
              Drop an .opk or an unpacked app <br />
              here to patch it
            </p>
      }
    </div>
  );
}

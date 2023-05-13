import { useEffect, useState } from 'react';
import { WindowTunnel } from 'ow-libs';

import { kRecordingReaderWriterName } from '../constants/config';
import { RecordingReaderWriter } from '../services/recording-writer';
import { RecordingTimeline } from '../shared';

// get RecordingReaderWriter instance from background window
const readerWriter = WindowTunnel.get<RecordingReaderWriter>(
  kRecordingReaderWriterName
);

export function useTimeline(uid: string) {
  const [val, setVal] = useState<RecordingTimeline | null>(null);

  useEffect(() => {
    setVal(null);
    readerWriter.getTimeline(uid).then(setVal);
  }, [uid]);

  return val;
}

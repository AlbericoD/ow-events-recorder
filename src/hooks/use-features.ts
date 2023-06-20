import { useMemo } from 'react';

import { useTimeline } from './use-timeline';
import { isRecordingGEPLEPEvent } from '../constants/type-guards';

export function useFeatures(uid: string) {
  const timeline = useTimeline(uid);

  return useMemo(() => {
    if (!timeline) {
      return [];
    }

    const features: string[] = [];

    for (var [, event] of timeline) {
      if (isRecordingGEPLEPEvent(event)) {
        const feature = event.data?.feature;

        if (feature && !features.includes(feature)) {
          features.push(feature);
        }
      }
    }

    return features;
  }, [timeline]);
}

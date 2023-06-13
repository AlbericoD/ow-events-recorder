import { kRecordingsDir, kRecordingSubDirPrefix, kRecordingHeaderFile, kRecordingTimelineFile, kOverwolfFSPrefix } from '../constants/config';
import { RecordingHeader, Recording, RecordingTimeline } from '../constants/types';
import { dir } from '../utils';

export class RecordingReader {
  async #getList() {
    const results = await dir(kRecordingsDir);

    if (!results.success || !results.data) {
      return [];
    }

    return results.data
      .filter(v => (
        v.type === 'dir' &&
        v.name.startsWith(kRecordingSubDirPrefix)
      ))
      .map(v => v.name
        .replaceAll('\\', '/')
        .replace(kRecordingsDir, '')
        .replace(kRecordingSubDirPrefix, '')
        .replace(`/${kRecordingHeaderFile}`, '')
      );
  }

  async getHeaders(): Promise<RecordingHeader[]> {
    const list = await this.#getList();

    if (list.length === 0) {
      return [];
    }

    const out = [];

    for (const uid of list) {
      const header = await this.getHeader(uid);

      if (header) {
        out.push(header);
      }
    }

    return out.sort((a, b) => b.startTime - a.startTime);
  }

  async getRecording(uid: string): Promise<Recording | null> {
    const header = await this.getHeader(uid);

    if (header) {
      const timeline = await this.getTimeline(uid);

      if (timeline) {
        return { ...header, timeline };
      }
    }

    return null;
  }

  async getHeader(uid: string): Promise<RecordingHeader | null> {
    const response = await fetch(
      RecordingReader.getOWFilePath(uid, kRecordingHeaderFile)
    );

    if (response.ok) {
      return response.json().catch(e => {
        console.error(e);
        return null;
      });
    }

    return null;
  }

  async getTimeline(uid: string): Promise<RecordingTimeline | null> {
    const response = await fetch(
      RecordingReader.getOWFilePath(uid, kRecordingTimelineFile)
    );

    if (response.ok) {
      return response.json().catch(e => {
        console.error(e);
        return null;
      });
    }

    return null;
  }

  protected static getDirPath(uid: string) {
    return kRecordingsDir + kRecordingSubDirPrefix + uid;
  }

  protected static getOWFilePath(uid: string, file: string) {
    return kOverwolfFSPrefix + RecordingReader.getFilePath(uid, file);
  }

  protected static getFilePath(uid: string, file: string) {
    return kRecordingsDir +
      kRecordingSubDirPrefix +
      uid +
      '/' +
      file;
  }
}

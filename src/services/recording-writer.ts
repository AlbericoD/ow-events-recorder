import { v4 as uuid } from 'uuid';

import { kOverwolfFSPrefix, kTempDir, kRecordingHeaderFile, kRecordingExportedExt, kRecordingTimelineFile } from '../constants/config';
import { RecordingReader } from './recording-reader';
import { RecordingHeader, Recording } from '../constants/types';
import { ERPIOService } from './erp-io';
import { sanitizeDirPath, sanitizePath, writeFile } from '../utils';

export class RecordingReaderWriter extends RecordingReader {
  #io: ERPIOService

  constructor(erpIO: ERPIOService) {
    super();
    this.#io = erpIO;
  }

  async #getHeaderByPath(headerPath: string): Promise<RecordingHeader | null> {
    const response = await fetch(kOverwolfFSPrefix + headerPath);

    if (response.ok) {
      return response.json().catch(e => {
        console.error(e);
        return null;
      });
    }

    return null;
  }

  async import(filePath: string) {
    let tempDir = `${kTempDir}${uuid()}/`;

    try {
      tempDir = sanitizePath(tempDir);
      filePath = sanitizePath(filePath);

      await this.#io.unzipFile(filePath, tempDir);

      const header = await this.#getHeaderByPath(
        tempDir + kRecordingHeaderFile
      );

      if (!header) {
        throw new Error('Could not import: faulty header');
      }

      await this.#io.move(
        tempDir,
        RecordingReader.getDirPath(header.uid),
        true
      );

      return true;
    } catch (e) {
      console.warn(e);
    }

    return false;
  }

  async export(uid: string, exportDir: string) {
    try {
      const header = await this.getHeader(uid);

      if (!header) {
        throw new Error('Could not export: faulty header');
      }

      const dateString = new Date(header.startTime)
        .toJSON()
        .split('.')[0]
        .replaceAll(':', ' ')
        .replaceAll('T', ' ')
        .replaceAll('Z', '');

      exportDir = sanitizeDirPath(exportDir);

      const filePath =
        exportDir + `${header.title} by ${header.author} ${dateString}` +
        '.' + kRecordingExportedExt;

      await this.#io.zipDirectory(
        RecordingReader.getDirPath(uid),
        filePath
      );

      return filePath;
    } catch (e) {
      console.warn(e);
    }

    return false;
  }

  async setHeader(header: RecordingHeader) {
    await writeFile(
      RecordingReader.getFilePath(header.uid, kRecordingHeaderFile),
      JSON.stringify(header)
    );
  }

  async set(recording: Recording) {
    const header: RecordingHeader = { ...recording };

    delete (header as Partial<Recording>).timeline;

    await this.setHeader(header);

    await writeFile(
      RecordingReader.getFilePath(header.uid, kRecordingTimelineFile),
      JSON.stringify(recording.timeline)
    );
  }

  async remove(uid: string) {
    const path = RecordingReaderWriter.getDirPath(uid);

    await this.#io.delete(path);
  }
}

import { OverwolfPlugin } from 'ow-libs';
import { v4 as uuid } from 'uuid';

import { Recording, RecordingHeader, RecordingReader, kOverwolfFSPrefix, kRecordingExportedExt, kRecordingHeaderFile, kRecordingTimelineFile, kRecordingsDir, writeFile } from '../shared';

interface ERPPlugin {
  unzipFile(
    sourceArchiveFileName: string,
    destinationDirectoryName: string,
    cb: overwolf.CallbackFunction<overwolf.Result>
  ): void
  zipDirectory(
    sourceDirectoryPath: string,
    destinationArchiveFileName: string,
    cb: overwolf.CallbackFunction<overwolf.Result>
  ): void
  move(
    sourcePath: string,
    destPath: string,
    overwrite: boolean,
    callback: overwolf.CallbackFunction<overwolf.Result>
  ): void
  delete(
    path: string,
    cb: overwolf.CallbackFunction<overwolf.Result>
  ): void
}

export class RecordingReaderWriter extends RecordingReader {
  #plugin = new OverwolfPlugin<ERPPlugin>('erp');

  async #zipDirectory(
    sourceArchiveFileName: string,
    destinationDirectoryName: string
  ) {
    const erpPlugin = await this.#plugin.getPlugin();

    await new Promise<void>((resolve, reject) => {
      erpPlugin.zipDirectory(
        sourceArchiveFileName,
        destinationDirectoryName,
        result => result.success ? resolve() : reject(new Error(result.error))
      );
    });
  }

  async #unzipFile(
    sourceDirectoryPath: string,
    destinationArchiveFileName: string
  ) {
    const erpPlugin = await this.#plugin.getPlugin();

    await new Promise<void>((resolve, reject) => {
      erpPlugin.unzipFile(
        sourceDirectoryPath,
        destinationArchiveFileName,
        result => result.success ? resolve() : reject(new Error(result.error))
      );
    });
  }

  async #moveFile(
    sourcePath: string,
    destPath: string,
    overwrite: boolean,
  ) {
    const erpPlugin = await this.#plugin.getPlugin();

    await new Promise<void>((resolve, reject) => {
      erpPlugin.move(
        sourcePath,
        destPath,
        overwrite,
        result => result.success ? resolve() : reject(new Error(result.error))
      );
    });
  }

  /* async #deleteFile(path: string) {
    const erpPlugin = await this.#plugin.getPlugin();

    console.log('#deleteFile():', path);

    await new Promise<void>((resolve, reject) => {
      erpPlugin.delete(
        path,
        result => result.success ? resolve() : reject(new Error(result.error))
      );
    });
  } */

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
    let tempDir = `${kRecordingsDir}temp/${uuid()}/`;

    try {
      tempDir = RecordingReaderWriter.sanitizePath(tempDir);
      filePath = RecordingReaderWriter.sanitizePath(filePath);

      await this.#unzipFile(filePath, tempDir);

      const header = await this.#getHeaderByPath(
        tempDir + kRecordingHeaderFile
      );

      if (!header) {
        throw new Error('Could not import: faulty header');
      }

      await this.#moveFile(
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

      exportDir = RecordingReaderWriter.sanitizeDirPath(exportDir);

      const filePath =
        exportDir + `${header.title} by ${header.author} ${dateString}` +
        '.' + kRecordingExportedExt;

      await this.#zipDirectory(
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
    const erpPlugin = await this.#plugin.getPlugin();

    const path = RecordingReaderWriter.getDirPath(uid);

    await new Promise<void>((resolve, reject) => {
      erpPlugin.delete(
        path,
        result => result.success ? resolve() : reject(new Error(result.error))
      );
    });
  }

  protected static sanitizePath(path: string): string {
    return path.replaceAll('\\', '/');
  }

  protected static sanitizeDirPath(path: string): string {
    if (path[path.length - 1] !== '/') {
      path += '/';
    }

    return RecordingReaderWriter.sanitizePath(path);
  }
}

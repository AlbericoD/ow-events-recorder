import { OverwolfPlugin } from 'ow-libs';

interface ERPPlugin {
  zipDirectory(
    sourceDirectoryPath: string,
    destinationArchiveFileName: string,
    cb: overwolf.CallbackFunction<overwolf.Result>
  ): void
  unzipFile(
    sourceArchiveFileName: string,
    destinationDirectoryName: string,
    cb: overwolf.CallbackFunction<overwolf.Result>
  ): void
  move(
    sourcePath: string,
    destPath: string,
    overwrite: boolean,
    callback: overwolf.CallbackFunction<overwolf.Result>
  ): void
  copyFile(
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

export class ERPIOService {
  #plugin = new OverwolfPlugin<ERPPlugin>('erp');

  async zipDirectory(
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

  async unzipFile(
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

  async move(
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

  async copyFile(
    sourcePath: string,
    destPath: string,
    overwrite: boolean,
  ) {
    const erpPlugin = await this.#plugin.getPlugin();

    await new Promise<void>((resolve, reject) => {
      erpPlugin.copyFile(
        sourcePath,
        destPath,
        overwrite,
        result => result.success ? resolve() : reject(new Error(result.error))
      );
    });
  }

  async delete(path: string) {
    const erpPlugin = await this.#plugin.getPlugin();

    await new Promise<void>((resolve, reject) => {
      erpPlugin.delete(
        path,
        result => result.success ? resolve() : reject(new Error(result.error))
      );
    });
  }
}

import { v4 as uuid } from 'uuid';

import { ERPIOService } from './erp-io';
import { kOverwolfFSPrefix } from '../constants/config';
import { dirName, sanitizeDirPath, sanitizePath, writeFile } from '../utils';

const kPatchedDescriptionPrefix = '(Overwolf ERP Patched) ';

export class PatcherService {
  #io: ERPIOService

  constructor(erpIO: ERPIOService) {
    this.#io = erpIO;
  }

  async patchApp(path: string) {
    if (path.endsWith('.opk')) {
      await this.#patchAppOPK(path);
    } else {
      await this.#patchAppDirectory(path, true);
    }
  }

  async #patchAppOPK(appOpkPath: string) {
    appOpkPath = sanitizePath(appOpkPath);

    const
      unpackParentDir = appOpkPath.slice(0, appOpkPath.lastIndexOf('/') + 1),
      unpackTempPath = sanitizeDirPath(unpackParentDir + uuid());

    await this.#io.unzipFile(appOpkPath, unpackTempPath);

    const appDirName = await this.#patchAppDirectory(unpackTempPath);

    const resultPath = sanitizeDirPath(unpackParentDir + appDirName);

    await this.#io.move(unpackTempPath, resultPath, true);

    overwolf.utils.openWindowsExplorer(resultPath, () => { });
  }

  /** @returns App name with version */
  async #patchAppDirectory(appPath: string, openDir = false): Promise<string> {
    appPath = sanitizeDirPath(appPath);

    const manifestPath = `${appPath}manifest.json`;

    const manifest = await this.#readJsonFile<overwolf.extensions.Manifest>(
      kOverwolfFSPrefix + manifestPath
    );

    const
      startWindowName = manifest.data.start_window,
      startWindowInfo = manifest.data.windows[startWindowName],
      startWindowHtmlPath = appPath + startWindowInfo.file,
      startWindowHtmlDir = dirName(startWindowHtmlPath);

    await this.#copyLibraries(startWindowHtmlDir);

    const manifestJSON = JSON.stringify(
      this.#processManifest(manifest),
      null,
      '  '
    );

    await writeFile(manifestPath, manifestJSON);

    const startWindowHtml = await this.#readTextFile(
      kOverwolfFSPrefix + startWindowHtmlPath
    );

    const processedStartWindowHtml = this.#processStartWindowHtml(
      startWindowHtml
    );

    await writeFile(startWindowHtmlPath, processedStartWindowHtml);

    if (openDir) {
      overwolf.utils.openWindowsExplorer(appPath, () => { });
    }

    return `${manifest.meta.name} - ${manifest.meta.version} ERP Patched`;
  }

  async #copyLibraries(toPath: string) {
    await this.#copyTextFile(
      `${window.location.origin}/js/player.js`,
      `${toPath}player.js`
    );

    try {
      await this.#copyTextFile(
        `${window.location.origin}/js/player.js.map`,
        `${toPath}player.js.map`
      );
    } catch (e) {
      console.error(e);
    }
  }

  #processManifest(
    manifest: overwolf.extensions.Manifest
  ): overwolf.extensions.Manifest {
    const
      startWindow = manifest.data.start_window,
      startWindowData = manifest.data.windows[startWindow]

    startWindowData.allow_local_file_access = true;

    for (const windowName in manifest.data.windows) {
      const windowData = manifest.data.windows[windowName];

      if (windowData.in_game_only) {
        windowData.in_game_only = false;
      }
    }

    if (!manifest.meta.description.startsWith(kPatchedDescriptionPrefix)) {
      manifest.meta.description = kPatchedDescriptionPrefix +
        manifest.meta.description;
    }

    return manifest;
  }

  #processStartWindowHtml(html: string): string {
    const
      scriptTag = '<script src="player.js"></script>',
      index = html.indexOf('<script');

    if (!html.includes(scriptTag)) {
      html = html.slice(0, index) + scriptTag + html.slice(index);
    }

    return html;
  }

  async #copyTextFile(fromPath: string, toPath: string): Promise<void> {
    const text = await this.#readTextFile(fromPath);

    await writeFile(toPath, text);
  }

  async #readTextFile(path: string): Promise<string> {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to read text file at ${path}`);
    }

    return await response.text();
  }

  async #readJsonFile<T>(path: string): Promise<T> {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to read json file at ${path}`);
    }

    return await response.json();
  }
}

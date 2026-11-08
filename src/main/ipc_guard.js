/**
 * IPC の送信元の確認。fork 独自（ukaji3/Zero-Quake、Issue #32）。
 *
 * アプリは外部の Web ページ（USGS のイベントページ）も BrowserWindow で開くため、
 * IPC はアプリに同梱したローカルの画面（file: でアプリのディレクトリ配下にあるページ）からだけ受け付ける。
 *
 * このモジュールは Electron に依存しない（node --test で検証できるようにするため）。
 */
import path from "path";
import { fileURLToPath } from "url";

/**
 * フレームの URL が、アプリのディレクトリ配下にあるローカルのページかを判定する。
 * @param {string | undefined | null} frameUrl 送信元フレームの URL
 * @param {string | undefined | null} appPath アプリのディレクトリ（`app.getAppPath()`）
 * @returns {boolean} アプリ内のローカルのページなら true
 */
export function isTrustedLocalPage(frameUrl, appPath) {
  if (!frameUrl || !appPath) return false;

  let filePath;
  try {
    const parsed = new URL(frameUrl);
    if (parsed.protocol !== "file:") return false;
    filePath = fileURLToPath(parsed);
  } catch {
    return false;
  }

  const root = path.resolve(appPath);
  const resolved = path.resolve(filePath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

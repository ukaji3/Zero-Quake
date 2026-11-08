/**
 * Linux（Ubuntu / GNOME）向けの処理。fork 独自（ukaji3/Zero-Quake）。
 * upstream のモジュールと分けて置き、upstream 取り込み時の衝突を減らす。
 */
import electron from "electron";
const { app } = electron;
import path from "path";
import fs from "fs";

/**
 * GNOME の自動起動用 .desktop ファイルのパスを返す。
 * @returns {string} `~/.config/autostart/zeroquake.desktop`
 */
export function linuxAutostartFile() {
  return path.join(app.getPath("home"), ".config", "autostart", "zeroquake.desktop");
}

/**
 * GNOME の自動起動用 .desktop ファイルが存在するかを返す。
 * @returns {boolean} 自動起動が有効なら true
 */
export function isLinuxAutostartEnabled() {
  return fs.existsSync(linuxAutostartFile());
}

/**
 * Desktop Entry の Exec キーに書く 1 つの引数（実行ファイルのパス）をエスケープする（Issue #33）。
 *
 * Desktop Entry 仕様の規則に従う。
 * 1. 引数を二重引用符で囲み、`"`、`` ` ``、`$`、`\` の前にバックスラッシュを付ける（引用の規則）
 * 2. 文字列値のエスケープ規則は引用の規則より先に適用されるため、バックスラッシュをさらに二重にする
 * 3. `%` はフィールドコードと区別するため `%%` にする
 * https://specifications.freedesktop.org/desktop-entry/latest/exec-variables.html
 * @param {string} arg 引数
 * @returns {string} Exec キーにそのまま書ける文字列
 * @throws {Error} 改行・タブ・復帰文字を含む場合（Exec キーに書けないため）
 */
export function escapeDesktopExecArg(arg) {
  const value = String(arg);
  if (/[\n\r\t]/.test(value)) throw new Error("Desktop Entry の Exec に改行・タブを含むパスは書けません");
  const quoted = `"${value.replace(/[\\"`$]/g, "\\$&")}"`;
  return quoted.replace(/\\/g, "\\\\").replace(/%/g, "%%");
}

/**
 * 自動起動で起動する実行ファイルのパスを返す（Issue #33）。
 * AppImage で起動している場合、実行ファイルは一時的なマウント先にあり再起動後は存在しないため、
 * AppImage 本体のパス（環境変数 APPIMAGE）を使う。
 * @param {NodeJS.ProcessEnv} [env] 環境変数
 * @param {() => string} [getExePath] 実行ファイルのパスを返す関数
 * @returns {string} 実行ファイルのパス
 */
export function resolveAutostartExecPath(env = process.env, getExePath = () => app.getPath("exe")) {
  if (env.APPIMAGE) return env.APPIMAGE;
  return getExePath();
}

/**
 * GNOME の自動起動用 .desktop ファイルの内容を作る（Issue #33）。
 * @param {string} execPath 実行ファイルのパス
 * @returns {string} .desktop ファイルの内容
 */
export function buildAutostartDesktopEntry(execPath) {
  return `[Desktop Entry]
Type=Application
Version=1.0
Name=Zero Quake
Comment=地震・津波情報表示アプリケーション
Exec=${escapeDesktopExecArg(execPath)}
Icon=zeroquake
Terminal=false
Categories=Utility;Network;
StartupNotify=true
X-GNOME-Autostart-enabled=true
`;
}

/**
 * Linux（GNOME）の自動起動を設定する。
 * `~/.config/autostart` に .desktop ファイルを作成または削除する。
 * @param {boolean} openAtLogin 自動起動を有効にするなら true
 */
export function setOpenAtLogin_Linux(openAtLogin) {
  app.setLoginItemSettings({
    openAtLogin: openAtLogin,
    openAsHidden: false,
    args: []
  });

  const desktopFile = linuxAutostartFile();
  const autostartDir = path.dirname(desktopFile);

  if (openAtLogin) {
    let desktopEntry;
    try {
      desktopEntry = buildAutostartDesktopEntry(resolveAutostartExecPath());
    } catch (err) {
      console.error(new Date().toLocaleString(), "[autostart]", err);
      return;
    }

    // autostart ディレクトリが存在しない場合は作成
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true });
    }
    fs.writeFileSync(desktopFile, desktopEntry, "utf8");
  } else if (fs.existsSync(desktopFile)) {
    // 自動起動を無効化
    fs.unlinkSync(desktopFile);
  }
}

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
    // autostart ディレクトリが存在しない場合は作成
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true });
    }

    const appPath = app.getPath("exe");
    const desktopEntry = `[Desktop Entry]
Type=Application
Version=1.0
Name=Zero Quake
Comment=地震・津波情報表示アプリケーション
Exec=${appPath}
Icon=zeroquake
Terminal=false
Categories=Utility;Network;
StartupNotify=true
X-GNOME-Autostart-enabled=true
`;

    fs.writeFileSync(desktopFile, desktopEntry, "utf8");
  } else if (fs.existsSync(desktopFile)) {
    // 自動起動を無効化
    fs.unlinkSync(desktopFile);
  }
}

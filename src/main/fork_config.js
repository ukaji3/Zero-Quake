/**
 * fork（ukaji3/Zero-Quake）固有の設定値。
 * upstream のモジュールと分けて置き、upstream 取り込み時の衝突を減らす。
 */

/**
 * アプリ内の更新確認で参照する GitHub Releases の API（Issue #35）。
 * fork は Ubuntu 向けの deb / AppImage を ukaji3/Zero-Quake の Releases で配布するため、
 * upstream（Windows 版のみ配布）ではなく fork の Releases を参照する。
 * バージョン番号は upstream と同じ番号を使う。
 */
export const FORK_RELEASES_API = "https://api.github.com/repos/ukaji3/Zero-Quake/releases";

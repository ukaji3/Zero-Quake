import { Boolean2 } from "./constants.js";

// アプリケーション全体で共有する状態
export var config = {};
export var defaultConfigVal = {};
export var store = null;
export var Replay = 0;
export var package_ver = "";
export var packageJson = null;
export var kmoniTimeTmp = {};
export var kmoniOffset = 2500;
export var JMA_CurrentInfoNumber = 20;
export var USGS_CurrentInfoNumber = 20;
export var EQ_FetchCount = 0;

// アプリケーション全体で共有する状態オブジェクト（セッター不要で直接プロパティ代入可能）
export const state = {
  get config() { return config; },
  set config(val) { config = val; },
  get defaultConfigVal() { return defaultConfigVal; },
  set defaultConfigVal(val) { defaultConfigVal = val; },
  get store() { return store; },
  set store(val) { store = val; },
  get Replay() { return Replay; },
  set Replay(val) { Replay = val; },
  get package_ver() { return package_ver; },
  set package_ver(val) { package_ver = val; },
  get packageJson() { return packageJson; },
  set packageJson(val) { packageJson = val; },
  get kmoniOffset() { return kmoniOffset; },
  set kmoniOffset(val) { kmoniOffset = val; },
  get JMA_CurrentInfoNumber() { return JMA_CurrentInfoNumber; },
  set JMA_CurrentInfoNumber(val) { JMA_CurrentInfoNumber = val; },
  get USGS_CurrentInfoNumber() { return USGS_CurrentInfoNumber; },
  set USGS_CurrentInfoNumber(val) { USGS_CurrentInfoNumber = val; },
  get EQ_FetchCount() { return EQ_FetchCount; },
  set EQ_FetchCount(val) { EQ_FetchCount = val; },
  get kmoniTimeTmp() { return kmoniTimeTmp; },
  set kmoniTimeTmp(val) { kmoniTimeTmp = val; },
};

// 後方互換用セッター（既存テスト・移行コード用）
export function setConfig(val) { state.config = val; }
export function setDefaultConfigVal(val) { state.defaultConfigVal = val; }
export function setStore(val) { state.store = val; }
export function setReplay(val) { state.Replay = val; }
export function setPackageVer(val) { state.package_ver = val; }
export function setPackageJson(val) { state.packageJson = val; }
export function setKmoniOffset(val) { state.kmoniOffset = val; }
export function setJMAInfoNumber(val) { state.JMA_CurrentInfoNumber = val; }
export function setUSGSInfoNumber(val) { state.USGS_CurrentInfoNumber = val; }
export function incEQFetchCount() { state.EQ_FetchCount++; }

// ステータス変更リスナー（UIへの通知用）
let statusListener = null;
export function setStatusListener(fn) {
  statusListener = fn;
}

export function UpdateStatus(type, condition, timeStamp) {
  if (!timeStamp || !Boolean2(new Date(timeStamp))) {
    timeStamp = new Date(Date.now() - Replay);
  } else {
    timeStamp = new Date(timeStamp);
  }

  kmoniTimeTmp[type] = {
    type: type,
    timestamp: timeStamp,
    LocalTime: new Date(),
    condition: condition,
  };

  if (statusListener) {
    statusListener(type, condition, timeStamp);
  }
}

/**
 * デバッグモード。起動引数に -v / --debug / --verbose / --debug-mode のいずれかがあると有効になる。
 * `npm start`（upstream の `electron . --develop --debug-mode`）でも有効になるよう --debug-mode を含める。
 * fork 独自（Ubuntu 版のトレイ・音声合成の調査用。Issue #27, #30）
 * @type {boolean}
 */
export const DEBUG_MODE = ["-v", "--debug", "--verbose", "--debug-mode"].some((flag) => process.argv.includes(flag));

/**
 * デバッグモード時のみ時刻付きでログ出力する。fork 独自（Issue #27）
 * @param {...unknown} args 出力内容
 */
export function debugLog(...args) {
  if (DEBUG_MODE) console.log(new Date().toLocaleString(), "[DEBUG]", ...args);
}

/**
 * 共通エラーハンドラ。
 * 情報源名を指定した場合は先頭に `[情報源名]` を付けて出力する（fork 独自。Issue #27）。
 * @param {unknown} err エラー
 * @param {string} [source] 情報源名
 */
export function GeneralError_handler(err, source) {
  if (source) console.error(new Date().toLocaleString(), `[${source}]`, err);
  else console.error(new Date().toLocaleString(), err);
}

/**
 * HTTP レスポンスの状態を検査し、失敗時は情報源名と URL を含むエラーを投げる。fork 独自（Issue #27）
 * URL のクエリ文字列とフラグメントは出力しない（Axis のアクセストークンなどをログに残さないため）。
 * @param {Response} r fetch のレスポンス
 * @param {string} source 情報源名
 * @returns {Response} 成功時は受け取ったレスポンスをそのまま返す
 */
export function ensureOk(r, source) {
  if (!r.ok) throw new Error(`HTTP Error: ${r.status} (${source}: ${stripQuery(r.url)})`);
  return r;
}

/**
 * URL からクエリ文字列とフラグメントを取り除く。解析できない値は空文字列を返す。
 * @param {string} url 対象 URL
 * @returns {string} `origin + pathname`
 */
function stripQuery(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "";
  }
}

var LastRunTime = 0;
var RunnningTimer;
export function IntervalRun(msec, func) {
  if (RunnningTimer) {
    clearInterval(RunnningTimer);
    RunnningTimer = null;
  }
  var dif = new Date() - LastRunTime;
  if (dif > msec) {
    func();
    LastRunTime = new Date();
  } else {
    RunnningTimer = setTimeout(function () {
      func();
      LastRunTime = new Date();
    }, msec - dif);
  }
}

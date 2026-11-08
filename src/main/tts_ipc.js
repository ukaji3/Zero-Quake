/**
 * 外部コマンドによる音声合成（CustomCommand）の IPC。fork 独自（ukaji3/Zero-Quake、Issue #32）。
 *
 * - `tts:speak`: WorkerWindow からの読み上げ要求。受け取るのは読み上げ文字列だけで、
 *   コマンドは保存済みの設定（テンプレート・話速・音高・音量）からメインプロセスで組み立てる。
 * - `tts:test`: 設定画面からのテスト実行。保存前のテンプレートと値を受け取り、結果を返す。
 */
import electron from "electron";
const { ipcMain } = electron;
import { exec } from "child_process";

import { config, debugLog } from "./state.js";
import { WorkerWindow, SettingWindow } from "./windows.js";
import { buildTTSCommand } from "./tts_command.js";

/** テスト実行のタイムアウト（ミリ秒） */
const TEST_TIMEOUT_MS = 10000;

/**
 * IPC の送信元が、指定したウィンドウの画面かを判定する。
 * @param {Electron.IpcMainEvent | Electron.IpcMainInvokeEvent} event IPC のイベント
 * @param {Electron.BrowserWindow | null} win 期待するウィンドウ
 * @returns {boolean} 送信元が win の画面なら true
 */
function isFromWindow(event, win) {
  return Boolean(win && !win.isDestroyed() && event.sender && event.sender.id === win.webContents.id);
}

/**
 * 組み立てたコマンドを実行する。
 * @param {string} command コマンドライン
 * @param {import("child_process").ExecOptions} options exec のオプション
 * @returns {Promise<{ success: boolean, error: string | null, stdout: string, stderr: string }>} 実行結果
 */
function runCommand(command, options) {
  return new Promise((resolve) => {
    exec(command, options, (error, stdout, stderr) => {
      resolve({
        success: !error,
        error: error ? error.message : null,
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? ""),
      });
    });
  });
}

/**
 * WorkerWindow からの読み上げ要求を処理する。
 * @param {Electron.IpcMainEvent} event IPC のイベント
 * @param {{ text?: unknown }} payload 読み上げ文字列
 */
async function handleSpeak(event, payload) {
  if (!isFromWindow(event, WorkerWindow)) {
    debugLog("tts:speak rejected: sender is not WorkerWindow");
    return;
  }
  const voiceParameter = config?.notice?.voice_parameter;
  if (!voiceParameter?.CustomCommand) return;

  const command = buildTTSCommand(voiceParameter.CustomCommand, {
    text: payload?.text,
    rate: voiceParameter.rate,
    pitch: voiceParameter.pitch,
    volume: voiceParameter.volume,
  });
  const result = await runCommand(command, {});
  if (!result.success) console.error(`TTS Command Error: ${result.error}`);
  else if (result.stderr) console.error(`TTS Command stderr: ${result.stderr}`);
}

/**
 * 設定画面からのテスト実行を処理する。
 * @param {Electron.IpcMainInvokeEvent} event IPC のイベント
 * @param {{ template?: unknown, text?: unknown, rate?: unknown, pitch?: unknown, volume?: unknown }} payload テンプレートと値
 * @returns {Promise<{ success: boolean, error: string | null, stdout: string, stderr: string }>} 実行結果
 */
async function handleTest(event, payload) {
  if (!isFromWindow(event, SettingWindow)) {
    debugLog("tts:test rejected: sender is not SettingWindow");
    return { success: false, error: "許可されていない送信元です", stdout: "", stderr: "" };
  }
  const template = String(payload?.template ?? "");
  if (template.trim() === "") {
    return { success: false, error: "コマンドが入力されていません", stdout: "", stderr: "" };
  }
  const command = buildTTSCommand(template, payload);
  debugLog("tts:test command:", command);
  const result = await runCommand(command, { timeout: TEST_TIMEOUT_MS });
  debugLog("tts:test result:", result);
  return result;
}

/**
 * 外部コマンドによる音声合成の IPC を登録する。
 */
export function registerTTSCommandIPC() {
  ipcMain.on("tts:speak", handleSpeak);
  ipcMain.handle("tts:test", handleTest);
}

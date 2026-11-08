/**
 * WorkerWindow（非表示の画面。強震モニタの画像解析と音声の再生を行う）の自動再生成の判定。
 * fork 独自（ukaji3/Zero-Quake、Issue #25: 2 秒周期の再生成ループの防止。Issue #38 でテストのため切り出し）。
 *
 * このモジュールは Electron に依存しない（node --test で検証できるようにするため）。
 */

/** 再生成の回数を数える期間（ミリ秒）。10 分 */
export const WORKER_RECREATE_WINDOW_MS = 600000;

/** 期間内に再生成してよい回数。これを超えると自動再生成を止める */
export const WORKER_RECREATE_MAX = 5;

/**
 * 再生成してよいかの判定結果。
 * @typedef {object} RecreateDecision
 * @property {boolean} allowed 再生成してよいなら true
 * @property {number[]} history 次の判定に使う再生成の時刻の履歴（期間外の時刻を除いたもの。許可した場合は now を追加済み）
 */

/**
 * 直近の再生成の履歴から、今回再生成してよいかを判定する。
 * 期間（windowMs）内の再生成が max 回に達していれば許可しない。許可しない場合は履歴に今回の時刻を追加しない。
 * 引数の配列は変更しない。
 * @param {readonly number[]} history これまでの再生成の時刻（Date.now() の値）
 * @param {number} now 今の時刻（Date.now() の値）
 * @param {number} [windowMs=WORKER_RECREATE_WINDOW_MS] 回数を数える期間（ミリ秒）
 * @param {number} [max=WORKER_RECREATE_MAX] 期間内に再生成してよい回数
 * @returns {RecreateDecision} 判定結果
 */
export function decideRecreate(history, now, windowMs = WORKER_RECREATE_WINDOW_MS, max = WORKER_RECREATE_MAX) {
  const recent = history.filter((time) => now - time < windowMs);
  if (recent.length >= max) return { allowed: false, history: recent };
  return { allowed: true, history: [...recent, now] };
}

/**
 * WorkerWindow が閉じたときに、再生成を予約するかを判定する。
 * 作り直しのために閉じた場合（intentionalClose）と、アプリの終了中は予約しない。
 * @param {{ intentionalClose?: boolean }} win 閉じたウィンドウ
 * @param {boolean} appQuitting アプリの終了処理中なら true
 * @returns {boolean} 再生成を予約するなら true
 */
export function shouldRecreateOnClose(win, appQuitting) {
  return !win.intentionalClose && !appQuitting;
}

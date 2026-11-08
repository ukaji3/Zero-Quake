/**
 * 設定の書き換え（ChangeConfig）で、設定画面以外から変更させない項目を守る。fork 独自（ukaji3/Zero-Quake、Issue #52）。
 *
 * 音声合成の設定（`notice.voice_parameter`）には、外部コマンドのテンプレート（CustomCommand）や
 * 棒読みちゃんのポート番号が含まれ、テンプレートはそのまま実行するコマンドになる。
 * メイン画面などは地図の表示切り替えのたびに設定全体を送るが、音声合成の設定を変える正当な操作はないため、
 * 設定画面以外から送られてきた場合は、この部分だけ今の値を残す。
 *
 * このモジュールは Electron に依存しない（node --test で検証できるようにするため）。
 */

/**
 * 値がプレーンなオブジェクト（配列・null 以外のオブジェクト）かを判定する。
 * @param {unknown} value 値
 * @returns {value is Record<string, unknown>} プレーンなオブジェクトなら true
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 設定画面以外から送られてきた設定に、今の音声合成の設定（`notice.voice_parameter`）を戻す。
 * 他の項目は送られてきた値のままにする。送られてきた設定はコピーしてから書き換えるので、引数は変更しない。
 * @param {unknown} incoming 送られてきた設定
 * @param {unknown} current 今の設定
 * @returns {{ config: unknown, changed: boolean }} 反映する設定と、音声合成の設定の変更を捨てたかどうか
 */
export function preserveVoiceParameter(incoming, current) {
  //設定として扱えない値は、従来どおりそのまま返す（音声合成の設定の保護だけを行う）
  if (!isPlainObject(incoming)) return { config: incoming, changed: false };

  const currentVoice = isPlainObject(current) && isPlainObject(current.notice) ? current.notice.voice_parameter : undefined;
  const incomingVoice = isPlainObject(incoming.notice) ? incoming.notice.voice_parameter : undefined;
  const changed = JSON.stringify(incomingVoice) !== JSON.stringify(currentVoice);

  const result = structuredClone(incoming);
  if (!isPlainObject(result.notice)) result.notice = {};
  if (currentVoice === undefined) delete result.notice.voice_parameter;
  else result.notice.voice_parameter = structuredClone(currentVoice);

  return { config: result, changed };
}

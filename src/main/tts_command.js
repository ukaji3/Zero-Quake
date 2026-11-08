/**
 * 外部コマンドによる音声合成（CustomCommand）のコマンド組み立て。fork 独自（ukaji3/Zero-Quake、Issue #32）。
 *
 * テンプレートは利用者が設定するシェルのコマンドライン（例: `espeak-ng -v ja '{text}'`）で、
 * `/bin/sh -c` で実行する。読み上げ文字列 `{text}` には外部の情報源から届いた文字列が入るため、
 * テンプレート中の位置の引用符の状態（引用符の外・単一引用符の中・二重引用符の中）を判定し、
 * その状態でシェルに解釈されない形にエスケープして埋め込む。
 * `{rate}` / `{pitch}` / `{volume}` は有限の数値だけを埋め込む。
 *
 * このモジュールは Electron に依存しない（node --test で検証できるようにするため）。
 */

/** 数値のプレースホルダーが不正な値だった場合に使う値 */
const NUMBER_FALLBACK = "1";

/**
 * 引用符の外に置く文字列として、POSIX シェルの単一引用符で囲む。
 * @param {string} text 埋め込む文字列
 * @returns {string} `'...'` 形式の文字列
 */
export function quoteForShellUnquoted(text) {
  return `'${text.replace(/'/g, "'\\''")}'`;
}

/**
 * 単一引用符の中に置く文字列としてエスケープする（`'` で一度閉じてから `\'` を入れて開き直す）。
 * @param {string} text 埋め込む文字列
 * @returns {string} 単一引用符の中にそのまま置ける文字列
 */
export function escapeForShellSingleQuoted(text) {
  return text.replace(/'/g, "'\\''");
}

/**
 * 二重引用符の中に置く文字列としてエスケープする。
 * POSIX シェルの二重引用符の中で特別な意味を持つ `\`、`"`、`$`、`` ` `` の前にバックスラッシュを付ける。
 * @param {string} text 埋め込む文字列
 * @returns {string} 二重引用符の中にそのまま置ける文字列
 */
export function escapeForShellDoubleQuoted(text) {
  return text.replace(/[\\"$`]/g, "\\$&");
}

/**
 * 数値のプレースホルダーに埋め込む文字列を返す。有限の数値でなければ既定値を返す。
 * @param {unknown} value 値
 * @returns {string} 数値の文字列（数字・小数点・符号・指数表記の e のみを含む）
 */
export function formatNumberPlaceholder(value) {
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : NUMBER_FALLBACK;
}

/**
 * 読み上げ文字列からシェルに渡せない文字（NUL）を取り除く。
 * @param {unknown} text 読み上げ文字列
 * @returns {string} 文字列
 */
function normalizeText(text) {
  return String(text ?? "").replace(/\0/g, "");
}

/**
 * 引用符の状態に応じて読み上げ文字列をエスケープする。
 * @param {string} text 読み上げ文字列
 * @param {"none" | "single" | "double"} state テンプレート中の位置の引用符の状態
 * @returns {string} エスケープ済みの文字列
 */
function escapeTextForState(text, state) {
  if (state === "single") return escapeForShellSingleQuoted(text);
  if (state === "double") return escapeForShellDoubleQuoted(text);
  return quoteForShellUnquoted(text);
}

/** プレースホルダー名 → 種類 */
const PLACEHOLDERS = {
  "{text}": "text",
  "{rate}": "rate",
  "{pitch}": "pitch",
  "{volume}": "volume",
};

/**
 * テンプレートの位置 index にプレースホルダーがあれば、その名前を返す。
 * @param {string} template テンプレート
 * @param {number} index 位置
 * @returns {string | null} プレースホルダー（例: `{text}`）または null
 */
function placeholderAt(template, index) {
  if (template[index] !== "{") return null;
  for (const name of Object.keys(PLACEHOLDERS)) {
    if (template.startsWith(name, index)) return name;
  }
  return null;
}

/**
 * テンプレートを先頭から走査し、各位置の引用符の状態を判定しながら次の 1 文字分を処理する。
 * @param {string} template テンプレート
 * @param {number} index 現在位置
 * @param {"none" | "single" | "double"} state 現在の引用符の状態
 * @returns {{ chunk: string, next: number, state: "none" | "single" | "double" }} 出力する文字列・次の位置・次の状態
 */
function scanChar(template, index, state) {
  const ch = template[index];
  if (state === "single") {
    return { chunk: ch, next: index + 1, state: ch === "'" ? "none" : "single" };
  }
  if (ch === "\\") {
    //バックスラッシュは次の 1 文字とまとめて出力する（引用符の外と二重引用符の中でのエスケープ）
    return { chunk: template.slice(index, index + 2), next: index + 2, state };
  }
  if (state === "double") {
    return { chunk: ch, next: index + 1, state: ch === "\"" ? "none" : "double" };
  }
  if (ch === "'") return { chunk: ch, next: index + 1, state: "single" };
  if (ch === "\"") return { chunk: ch, next: index + 1, state: "double" };
  return { chunk: ch, next: index + 1, state: "none" };
}

/**
 * CustomCommand のテンプレートから、シェルで実行するコマンドラインを組み立てる。
 * @param {string} template テンプレート（例: `espeak-ng -v ja -s {rate}00 '{text}'`）
 * @param {{ text?: unknown, rate?: unknown, pitch?: unknown, volume?: unknown }} params 置換する値
 * @returns {string} コマンドライン
 */
export function buildTTSCommand(template, params) {
  const source = String(template ?? "");
  const text = normalizeText(params?.text);
  let state = "none";
  let output = "";
  let index = 0;
  while (index < source.length) {
    const placeholder = placeholderAt(source, index);
    if (placeholder) {
      const kind = PLACEHOLDERS[placeholder];
      output += kind === "text" ? escapeTextForState(text, state) : formatNumberPlaceholder(params?.[kind]);
      index += placeholder.length;
      continue;
    }
    const result = scanChar(source, index, state);
    output += result.chunk;
    index = result.next;
    state = result.state;
  }
  return output;
}

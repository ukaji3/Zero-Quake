// fork 独自: デバッグモードの判定と、情報源名付きの HTTP エラー（Issue #27。テストは Issue #38）
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ensureOk } from "../src/main/state.js";

const execFileAsync = promisify(execFile);

/** 子プロセスで読み込む state.js の URL */
const STATE_MODULE_URL = new URL("../src/main/state.js", import.meta.url).href;

/**
 * 子プロセスの結果。
 * @typedef {object} ChildResult
 * @property {boolean} debugMode 子プロセスでの DEBUG_MODE の値
 * @property {string} stdout debugLog("probe") を呼んだときの標準出力（JSON の行を除く）
 */

/**
 * 起動引数を付けた子プロセスで state.js を読み込み、DEBUG_MODE の値と debugLog の出力を返す。
 * DEBUG_MODE は読み込み時の process.argv で決まるため、引数ごとに別のプロセスで確かめる。
 * @param {string[]} args 子プロセスの起動引数（スクリプトに渡す引数）
 * @returns {Promise<ChildResult>} 結果
 */
async function runWithArgs(args) {
  const code = [
    "const m = await import(process.env.STATE_MODULE_URL);",
    "m.debugLog('probe');",
    "console.log(JSON.stringify({ debugMode: m.DEBUG_MODE }));",
  ].join("\n");
  const { stdout } = await execFileAsync(process.execPath, ["--input-type=module", "-e", code, "--", ...args], {
    env: { ...process.env, STATE_MODULE_URL },
  });
  const lines = stdout.trimEnd().split("\n");
  const lastLine = lines.pop();
  //子プロセスが JSON の行を出力せずに正常終了した場合も、原因がわかるよう標準出力を含めて失敗させる
  //（読み込みに失敗した場合は子プロセスが終了コード 1 で終わり、execFile 自体が stderr 付きで失敗する）
  if (!lastLine) throw new Error(`子プロセスが結果（JSON）を出力しなかった。stdout: ${JSON.stringify(stdout)}`);
  const result = JSON.parse(lastLine);
  return { debugMode: result.debugMode, stdout: lines.join("\n") };
}

describe("fork: DEBUG_MODE と debugLog (Issue #27, #38)", () => {
  for (const flag of ["-v", "--debug", "--verbose", "--debug-mode"]) {
    it(`起動引数に ${flag} があると有効になり、debugLog が出力する`, async () => {
      const { debugMode, stdout } = await runWithArgs([flag]);
      assert.equal(debugMode, true);
      assert.match(stdout, /\[DEBUG\] probe$/);
    });
  }

  it("npm start と同じ引数（--develop --debug-mode）でも有効になる", async () => {
    const { debugMode } = await runWithArgs(["--develop", "--debug-mode"]);
    assert.equal(debugMode, true);
  });

  it("どれも無ければ無効で、debugLog は何も出力しない", async () => {
    const { debugMode, stdout } = await runWithArgs([]);
    assert.equal(debugMode, false);
    assert.equal(stdout, "");
  });

  it("--develop だけでは有効にならない", async () => {
    const { debugMode } = await runWithArgs(["--develop"]);
    assert.equal(debugMode, false);
  });
});

describe("fork: ensureOk (Issue #27, #38)", () => {
  it("成功したレスポンスはそのまま返す", () => {
    const response = { ok: true, status: 200, url: "https://example.com/data.json" };
    assert.equal(ensureOk(response, "テスト"), response);
  });

  it("失敗したら、状態コード・情報源名・URL を含むエラーを投げる", () => {
    const response = { ok: false, status: 503, url: "https://example.com/api/data.json" };
    assert.throws(() => ensureOk(response, "P2P"), {
      message: "HTTP Error: 503 (P2P: https://example.com/api/data.json)",
    });
  });

  it("URL のクエリ文字列とフラグメントはエラーに含めない（アクセストークンをログに残さない）", () => {
    const response = { ok: false, status: 401, url: "https://axis.prioris.jp/api/eew?token=SECRET_TOKEN&x=1#frag" };
    assert.throws(
      () => ensureOk(response, "Axis"),
      (error) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "HTTP Error: 401 (Axis: https://axis.prioris.jp/api/eew)");
        assert.doesNotMatch(error.message, /SECRET_TOKEN|token=|#frag/);
        return true;
      },
    );
  });

  it("URL のユーザー情報（user:pass@）もエラーに含めない", () => {
    const response = { ok: false, status: 403, url: "https://user:pass@example.com/a" };
    assert.throws(() => ensureOk(response, "テスト"), {
      message: "HTTP Error: 403 (テスト: https://example.com/a)",
    });
  });

  it("URL を解析できない場合は URL を空にする", () => {
    for (const url of ["", "not a url", undefined]) {
      const response = { ok: false, status: 500, url };
      assert.throws(() => ensureOk(response, "テスト"), {
        message: "HTTP Error: 500 (テスト: )",
      });
    }
  });
});

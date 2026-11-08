// fork 独自: 外部コマンドによる音声合成（CustomCommand）のコマンド組み立てと IPC の送信元判定（Issue #32）
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildTTSCommand,
  quoteForShellUnquoted,
  escapeForShellSingleQuoted,
  escapeForShellDoubleQuoted,
  formatNumberPlaceholder,
} from "../src/main/tts_command.js";
import { isTrustedLocalPage } from "../src/main/ipc_guard.js";

const execFileAsync = promisify(execFile);

/**
 * 組み立てたコマンドを /bin/sh で実行し、標準出力を返す（main の exec() と同じく sh -c で実行する）。
 * @param {string} command コマンドライン
 * @returns {Promise<string>} 標準出力
 */
async function runShell(command) {
  const { stdout } = await execFileAsync("/bin/sh", ["-c", command]);
  return stdout;
}

/** 引用符を抜けてコマンドを実行させようとする読み上げ文字列 */
const MALICIOUS_TEXTS = [
  "震源地X'; echo INJECTED; echo '",
  "震源地X\"; echo INJECTED; echo \"",
  "$(echo INJECTED)",
  "`echo INJECTED`",
  "a\\'b; echo INJECTED",
  "改行\necho INJECTED",
  "${HOME} $HOME %s",
];

/** テンプレート中の {text} の書き方（引用符の外・単一引用符・二重引用符・文字列の途中） */
const TEMPLATES = [
  "printf '%s\\n' '{text}'",
  "printf '%s\\n' \"{text}\"",
  "printf '%s\\n' {text}",
  "printf '%s\\n' '前置き {text} 後置き'",
  "printf '%s\\n' \"前置き {text} 後置き\"",
  "echo '{text}' | cat",
];

/**
 * テンプレートで {text} の前後に付く固定文字列を返す。
 * @param {string} template テンプレート
 * @returns {[string, string]} 前置き・後置き
 */
function affixes(template) {
  return template.includes("前置き") ? ["前置き ", " 後置き"] : ["", ""];
}

describe("fork tts_command.js - quoting helpers", () => {
  it("quotes text for an unquoted position", () => {
    assert.equal(quoteForShellUnquoted("it's"), "'it'\\''s'");
  });

  it("escapes text for a single-quoted position", () => {
    assert.equal(escapeForShellSingleQuoted("a'b"), "a'\\''b");
  });

  it("escapes text for a double-quoted position", () => {
    assert.equal(escapeForShellDoubleQuoted("a\"b$c`d\\e"), "a\\\"b\\$c\\`d\\\\e");
  });

  it("formats only finite numbers for numeric placeholders", () => {
    assert.equal(formatNumberPlaceholder(1.5), "1.5");
    assert.equal(formatNumberPlaceholder("2"), "2");
    assert.equal(formatNumberPlaceholder("1; rm -rf ~"), "1");
    assert.equal(formatNumberPlaceholder(Infinity), "1");
    assert.equal(formatNumberPlaceholder(undefined), "1");
  });
});

describe("fork tts_command.js - buildTTSCommand", () => {
  it("keeps the default template working", () => {
    assert.equal(
      buildTTSCommand("espeak-ng -v ja '{text}'", { text: "緊急地震速報です" }),
      "espeak-ng -v ja '緊急地震速報です'"
    );
  });

  it("replaces numeric placeholders with sanitized numbers", () => {
    assert.equal(
      buildTTSCommand("espeak-ng -s {rate}00 -p {pitch}0 -a {volume}00 '{text}'", { text: "x", rate: 1.2, pitch: "$(id)", volume: 1 }),
      "espeak-ng -s 1.200 -p 10 -a 100 'x'"
    );
  });

  it("removes NUL characters from the text", () => {
    assert.equal(buildTTSCommand("echo '{text}'", { text: "a\0b" }), "echo 'ab'");
  });

  for (const template of TEMPLATES) {
    for (const text of MALICIOUS_TEXTS) {
      it(`passes the text through /bin/sh unchanged: ${JSON.stringify(template)} / ${JSON.stringify(text)}`, async () => {
        const stdout = await runShell(buildTTSCommand(template, { text }));
        const [prefix, suffix] = affixes(template);
        assert.equal(stdout, `${prefix}${text}${suffix}\n`);
        assert.ok(!/^INJECTED$/m.test(stdout), "読み上げ文字列がコマンドとして実行されないこと");
      });
    }
  }
});

describe("fork ipc_guard.js - isTrustedLocalPage", () => {
  const appPath = path.resolve("/opt/Zero Quake/resources/app.asar");

  it("accepts local pages under the app directory", () => {
    assert.equal(isTrustedLocalPage(pathToFileURL(path.join(appPath, "src/index.html")).href, appPath), true);
    assert.equal(isTrustedLocalPage("file:///opt/Zero%20Quake/resources/app.asar/src/settings.html", appPath), true);
  });

  it("rejects remote pages and other local files", () => {
    assert.equal(isTrustedLocalPage("https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd", appPath), false);
    assert.equal(isTrustedLocalPage("http://localhost/src/index.html", appPath), false);
    assert.equal(isTrustedLocalPage("file:///tmp/evil.html", appPath), false);
    assert.equal(isTrustedLocalPage("file:///opt/Zero%20Quake/resources/app.asar.evil/src/index.html", appPath), false);
    assert.equal(isTrustedLocalPage("file:///opt/Zero%20Quake/resources/app.asar/../../../../tmp/evil.html", appPath), false);
  });

  it("rejects missing or malformed values", () => {
    assert.equal(isTrustedLocalPage(undefined, appPath), false);
    assert.equal(isTrustedLocalPage("not a url", appPath), false);
    assert.equal(isTrustedLocalPage("file:///opt/Zero%20Quake/resources/app.asar/src/index.html", ""), false);
  });
});

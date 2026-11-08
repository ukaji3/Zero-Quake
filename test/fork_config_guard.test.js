// fork 独自: 設定の書き換え（ChangeConfig）で、音声合成の設定を設定画面以外から変更させない（Issue #52）
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { preserveVoiceParameter } from "../src/main/config_guard.js";
import { isSenderWindow } from "../src/main/ipc_guard.js";

/**
 * 今の設定（main の既定値に近い形）を作る。テストごとに新しいオブジェクトを返す。
 * @returns {Record<string, any>} 設定
 */
function makeCurrentConfig() {
  return {
    data: { layer: "tile1" },
    notice: {
      bell_volume: 1,
      voice_parameter: {
        rate: 1,
        pitch: 1,
        volume: 1,
        voice: "",
        engine: "CustomCommand",
        Boyomi_Port: 50080,
        Boyomi_Voice: "auto",
        CustomCommand: "espeak-ng -v ja '{text}'",
      },
    },
  };
}

/**
 * テスト用のウィンドウ（BrowserWindow の代わり）を作る。
 * @param {number} id webContents の ID
 * @param {boolean} [destroyed=false] 破棄済みかどうか
 * @returns {{ isDestroyed: () => boolean, webContents: { id: number } }} ウィンドウ
 */
function makeWindow(id, destroyed = false) {
  return { isDestroyed: () => destroyed, webContents: { id } };
}

describe("fork: preserveVoiceParameter (Issue #52)", () => {
  it("他の画面から送られた外部コマンドのテンプレートを捨て、今の音声合成の設定を残す", () => {
    const current = makeCurrentConfig();
    const incoming = makeCurrentConfig();
    incoming.notice.voice_parameter.CustomCommand = "touch /tmp/PWNED";

    const { config, changed } = preserveVoiceParameter(incoming, current);

    assert.equal(changed, true);
    assert.deepEqual(config.notice.voice_parameter, current.notice.voice_parameter);
  });

  it("エンジンや棒読みちゃんのポート番号の変更も捨てる", () => {
    const current = makeCurrentConfig();
    current.notice.voice_parameter.engine = "Default";
    const incoming = makeCurrentConfig();
    incoming.notice.voice_parameter.engine = "CustomCommand";
    incoming.notice.voice_parameter.Boyomi_Port = 8080;

    const { config, changed } = preserveVoiceParameter(incoming, current);

    assert.equal(changed, true);
    assert.equal(config.notice.voice_parameter.engine, "Default");
    assert.equal(config.notice.voice_parameter.Boyomi_Port, 50080);
  });

  it("音声合成の設定以外の項目は、送られてきた値を反映する", () => {
    const current = makeCurrentConfig();
    const incoming = makeCurrentConfig();
    incoming.data.layer = "tile2";
    incoming.notice.bell_volume = 0.5;
    incoming.notice.voice_parameter.CustomCommand = "touch /tmp/PWNED";

    const { config } = preserveVoiceParameter(incoming, current);

    assert.equal(config.data.layer, "tile2");
    assert.equal(config.notice.bell_volume, 0.5);
  });

  it("音声合成の設定が同じなら changed は false", () => {
    const current = makeCurrentConfig();
    const incoming = makeCurrentConfig();
    incoming.data.layer = "tile2";

    const { config, changed } = preserveVoiceParameter(incoming, current);

    assert.equal(changed, false);
    assert.deepEqual(config.notice.voice_parameter, current.notice.voice_parameter);
    assert.equal(config.data.layer, "tile2");
  });

  it("送られてきた設定に voice_parameter がなければ、今の値を戻す", () => {
    const current = makeCurrentConfig();
    const incoming = makeCurrentConfig();
    delete incoming.notice.voice_parameter;

    const { config, changed } = preserveVoiceParameter(incoming, current);

    assert.equal(changed, true);
    assert.deepEqual(config.notice.voice_parameter, current.notice.voice_parameter);
    assert.equal(config.notice.bell_volume, 1);
  });

  it("送られてきた設定に notice がなければ、notice を作って今の値を戻す", () => {
    const current = makeCurrentConfig();
    const incoming = { data: { layer: "tile2" } };

    const { config, changed } = preserveVoiceParameter(incoming, current);

    assert.equal(changed, true);
    assert.deepEqual(config.notice, { voice_parameter: current.notice.voice_parameter });
    assert.equal(config.data.layer, "tile2");
  });

  it("送られてきた notice がオブジェクトでなければ、notice を作り直して今の値を戻す", () => {
    const current = makeCurrentConfig();
    const incoming = { data: { layer: "tile2" }, notice: "broken" };

    const { config, changed } = preserveVoiceParameter(incoming, current);

    assert.equal(changed, true);
    assert.deepEqual(config.notice, { voice_parameter: current.notice.voice_parameter });
  });

  it("今の設定に音声合成の設定がなければ、送られてきた値も捨てる（キーを削除する）", () => {
    const current = { data: { layer: "tile1" }, notice: { bell_volume: 1 } };
    const incoming = makeCurrentConfig();
    incoming.notice.voice_parameter.CustomCommand = "touch /tmp/PWNED";

    const { config, changed } = preserveVoiceParameter(incoming, current);

    assert.equal(changed, true);
    assert.equal(Object.hasOwn(config.notice, "voice_parameter"), false);
    assert.equal(config.notice.bell_volume, 1);
  });

  it("今の設定がオブジェクトでなくても、送られてきた音声合成の設定は捨てる", () => {
    const incoming = makeCurrentConfig();

    const { config, changed } = preserveVoiceParameter(incoming, undefined);

    assert.equal(changed, true);
    assert.equal(Object.hasOwn(config.notice, "voice_parameter"), false);
  });

  it("両方に音声合成の設定がなければ changed は false", () => {
    const current = { notice: { bell_volume: 1 } };
    const incoming = { notice: { bell_volume: 0.5 } };

    const { config, changed } = preserveVoiceParameter(incoming, current);

    assert.equal(changed, false);
    assert.equal(Object.hasOwn(config.notice, "voice_parameter"), false);
    assert.equal(config.notice.bell_volume, 0.5);
  });

  for (const value of [null, undefined, "string", 1, ["array"]]) {
    it(`設定として扱えない値（${JSON.stringify(value)}）はそのまま返し、changed は false`, () => {
      const { config, changed } = preserveVoiceParameter(value, makeCurrentConfig());

      assert.equal(config, value);
      assert.equal(changed, false);
    });
  }

  it("引数（送られてきた設定と今の設定）を変更しない", () => {
    const current = makeCurrentConfig();
    const incoming = makeCurrentConfig();
    incoming.notice.voice_parameter.CustomCommand = "touch /tmp/PWNED";
    const incomingBefore = structuredClone(incoming);
    const currentBefore = structuredClone(current);

    preserveVoiceParameter(incoming, current);

    assert.deepEqual(incoming, incomingBefore);
    assert.deepEqual(current, currentBefore);
  });

  it("返す設定の音声合成の設定は今の設定と別のオブジェクト（後から書き換えても今の設定に影響しない）", () => {
    const current = makeCurrentConfig();
    const incoming = makeCurrentConfig();

    const { config } = preserveVoiceParameter(incoming, current);
    config.notice.voice_parameter.CustomCommand = "touch /tmp/PWNED";

    assert.notEqual(config.notice.voice_parameter, current.notice.voice_parameter);
    assert.equal(current.notice.voice_parameter.CustomCommand, "espeak-ng -v ja '{text}'");
  });
});

describe("fork: isSenderWindow (Issue #32, #52)", () => {
  it("送信元の webContents の ID が一致すれば true", () => {
    assert.equal(isSenderWindow({ sender: { id: 3 } }, makeWindow(3)), true);
  });

  it("ID が異なれば false", () => {
    assert.equal(isSenderWindow({ sender: { id: 4 } }, makeWindow(3)), false);
  });

  it("ウィンドウが破棄済みなら false", () => {
    assert.equal(isSenderWindow({ sender: { id: 3 } }, makeWindow(3, true)), false);
  });

  it("ウィンドウが開かれていなければ（null / undefined）false", () => {
    assert.equal(isSenderWindow({ sender: { id: 3 } }, null), false);
    assert.equal(isSenderWindow({ sender: { id: 3 } }, undefined), false);
  });

  it("送信元の情報がなければ false", () => {
    assert.equal(isSenderWindow({}, makeWindow(3)), false);
    assert.equal(isSenderWindow(null, makeWindow(3)), false);
    assert.equal(isSenderWindow(undefined, makeWindow(3)), false);
  });

  it("送信元の ID がなく、ウィンドウの ID もない場合は false（undefined 同士を一致とみなさない）", () => {
    const win = { isDestroyed: () => false, webContents: {} };
    assert.equal(isSenderWindow({ sender: {} }, win), false);
  });

  it("ID が整数でなければ、同じ値でも false", () => {
    const win = { isDestroyed: () => false, webContents: { id: "3" } };
    assert.equal(isSenderWindow({ sender: { id: "3" } }, win), false);
  });
});

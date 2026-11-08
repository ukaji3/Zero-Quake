// fork 独自: WorkerWindow の自動再生成の判定（Issue #25。テストは Issue #38）
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  WORKER_RECREATE_WINDOW_MS,
  WORKER_RECREATE_MAX,
  decideRecreate,
  shouldRecreateOnClose,
} from "../src/main/worker_guard.js";

/** テストの基準時刻（Date.now() 相当の値） */
const T0 = 1_700_000_000_000;

/**
 * decideRecreate を続けて呼び、各回の allowed を返す。
 * @param {number[]} times 呼び出す時刻
 * @returns {{ allowed: boolean[], history: number[] }} 各回の判定と最後の履歴
 */
function runSequence(times) {
  let history = [];
  const allowed = [];
  for (const now of times) {
    const decision = decideRecreate(history, now);
    allowed.push(decision.allowed);
    history = decision.history;
  }
  return { allowed, history };
}

describe("fork: decideRecreate (Issue #25, #38)", () => {
  it("上限は 10 分間に 5 回", () => {
    assert.equal(WORKER_RECREATE_WINDOW_MS, 10 * 60 * 1000);
    assert.equal(WORKER_RECREATE_MAX, 5);
  });

  it("10 分以内なら 5 回目までは許可し、6 回目は許可しない", () => {
    const times = [0, 1, 2, 3, 4, 5].map((i) => T0 + i * 2000); //2 秒ごと（再生成ループと同じ間隔）
    const { allowed } = runSequence(times);
    assert.deepEqual(allowed, [true, true, true, true, true, false]);
  });

  it("許可しない場合は履歴に今回の時刻を追加しない", () => {
    const history = [0, 1, 2, 3, 4].map((i) => T0 + i * 1000);
    const decision = decideRecreate(history, T0 + 5000);
    assert.equal(decision.allowed, false);
    assert.deepEqual(decision.history, history);
  });

  it("許可した場合は履歴の末尾に今回の時刻を追加する", () => {
    const decision = decideRecreate([T0], T0 + 1000);
    assert.equal(decision.allowed, true);
    assert.deepEqual(decision.history, [T0, T0 + 1000]);
  });

  it("10 分より前の再生成は数えない（ちょうど 10 分前の時刻も除く）", () => {
    const history = [0, 1, 2, 3, 4].map((i) => T0 + i * 1000);
    //最初の時刻からちょうど 10 分後: 最初の 1 件が期間外になり、4 件 + 今回で許可される
    const decision = decideRecreate(history, T0 + WORKER_RECREATE_WINDOW_MS);
    assert.equal(decision.allowed, true);
    assert.deepEqual(decision.history, [...history.slice(1), T0 + WORKER_RECREATE_WINDOW_MS]);
  });

  it("10 分の 1 ミリ秒前の再生成は数える", () => {
    const history = [0, 1, 2, 3, 4].map((i) => T0 + i * 1000);
    const decision = decideRecreate(history, T0 + WORKER_RECREATE_WINDOW_MS - 1);
    assert.equal(decision.allowed, false);
  });

  it("止まった後も、10 分たてば再び許可する", () => {
    const burst = [0, 1, 2, 3, 4, 5].map((i) => T0 + i * 2000);
    const later = T0 + 5 * 2000 + WORKER_RECREATE_WINDOW_MS;
    const { allowed } = runSequence([...burst, later]);
    assert.deepEqual(allowed, [true, true, true, true, true, false, true]);
  });

  it("引数の履歴の配列を変更しない", () => {
    const history = [T0 - WORKER_RECREATE_WINDOW_MS, T0];
    const before = [...history];
    decideRecreate(history, T0 + 1000);
    assert.deepEqual(history, before);
  });

  it("期間と回数を引数で変えられる", () => {
    const decision = decideRecreate([T0, T0 + 10], T0 + 20, 100, 2);
    assert.equal(decision.allowed, false);
    assert.equal(decideRecreate([T0, T0 + 10], T0 + 100, 100, 2).allowed, true);
  });
});

describe("fork: shouldRecreateOnClose (Issue #25, #38)", () => {
  it("予期しない閉鎖なら再生成を予約する", () => {
    assert.equal(shouldRecreateOnClose({}, false), true);
    assert.equal(shouldRecreateOnClose({ intentionalClose: false }, false), true);
  });

  it("作り直しのために閉じた場合は予約しない", () => {
    assert.equal(shouldRecreateOnClose({ intentionalClose: true }, false), false);
  });

  it("アプリの終了中は予約しない", () => {
    assert.equal(shouldRecreateOnClose({}, true), false);
    assert.equal(shouldRecreateOnClose({ intentionalClose: true }, true), false);
  });
});

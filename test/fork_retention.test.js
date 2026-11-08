// fork 独自: メインプロセスの保持データの件数上限（Issue #24, #36）
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  RETENTION_LIMITS,
  pruneObjectByCount,
  pruneArrayByCount,
  truncateOldest,
} from "../src/main/retention.js";

const byT = (e) => e.t;

describe("fork retention.js - pruneArrayByCount", () => {
  it("keeps the newest items and preserves their order", () => {
    const arr = [{ id: "a", t: 5 }, { id: "b", t: 1 }, { id: "c", t: 9 }, { id: "d", t: 3 }, { id: "e", t: 7 }];
    assert.equal(pruneArrayByCount(arr, 3, byT), 2);
    assert.deepEqual(arr.map((e) => e.id), ["a", "c", "e"]);
  });

  it("does not exceed the limit when the same object appears more than once (Issue #36)", () => {
    const A = { id: "A", t: 9 }, B = { id: "B", t: 1 }, C = { id: "C", t: 2 };
    const arr = [A, A, A, B, C];
    assert.equal(pruneArrayByCount(arr, 2, byT), 3);
    assert.equal(arr.length, 2);
    assert.deepEqual(arr.map((e) => e.id), ["A", "A"]);
  });

  it("keeps the earlier items when keys are equal", () => {
    const arr = [{ id: "a", t: 1 }, { id: "b", t: 1 }, { id: "c", t: 1 }];
    pruneArrayByCount(arr, 2, byT);
    assert.deepEqual(arr.map((e) => e.id), ["a", "b"]);
  });

  it("does nothing within the limit", () => {
    const arr = [{ t: 1 }, { t: 2 }];
    assert.equal(pruneArrayByCount(arr, 2, byT), 0);
    assert.equal(arr.length, 2);
  });

  it("empties the array when the limit is 0", () => {
    const arr = [{ t: 1 }, { t: 2 }];
    assert.equal(pruneArrayByCount(arr, 0, byT), 2);
    assert.equal(arr.length, 0);
  });
});

describe("fork retention.js - pruneObjectByCount / truncateOldest", () => {
  it("removes the oldest keys from an object", () => {
    const obj = {};
    for (let i = 0; i < 10; i++) obj[`e${i}`] = { t: i };
    assert.equal(pruneObjectByCount(obj, 3, byT), 7);
    assert.deepEqual(Object.keys(obj), ["e7", "e8", "e9"]);
  });

  it("removes items from the head of an array", () => {
    const arr = [1, 2, 3, 4, 5];
    truncateOldest(arr, 2);
    assert.deepEqual(arr, [4, 5]);
    const short = [1];
    truncateOldest(short, 2);
    assert.deepEqual(short, [1]);
  });

  it("defines positive limits", () => {
    for (const [key, value] of Object.entries(RETENTION_LIMITS)) {
      assert.ok(Number.isInteger(value) && value > 0, key);
    }
  });
});

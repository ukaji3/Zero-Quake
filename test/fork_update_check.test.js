// fork 独自: アプリ内の更新確認の参照先（Issue #35）
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { FORK_RELEASES_API } from "../src/main/fork_config.js";
import { checkUpdate } from "../src/main/RX_OtherAPIs.js";
import { setConfig, setPackageVer, setPackageJson } from "../src/main/state.js";

describe("fork update check - releases source", () => {
  it("points to the fork's GitHub Releases API", () => {
    assert.equal(FORK_RELEASES_API, "https://api.github.com/repos/ukaji3/Zero-Quake/releases");
  });

  it("checkUpdate requests the fork's releases, not upstream's", async () => {
    setConfig({});
    setPackageVer("0.9.10");
    setPackageJson({ version: "0.9.10" });

    const requested = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (url) => {
      requested.push(String(url));
      //結果は使わない（通知や設定画面への送信が起きないよう、失敗として返す）
      return Promise.reject(new Error("test: network disabled"));
    };
    const originalError = console.error;
    console.error = () => { };
    try {
      checkUpdate(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalError;
    }

    assert.equal(requested.length, 1);
    assert.ok(requested[0].startsWith(`${FORK_RELEASES_API}?_=`), requested[0]);
    assert.ok(!requested[0].includes("0quake"), "upstream の Releases を参照しないこと");
  });
});

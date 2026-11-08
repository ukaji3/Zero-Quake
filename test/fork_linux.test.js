// fork 独自: GNOME 自動起動用 .desktop の生成（Issue #33）
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  escapeDesktopExecArg,
  resolveAutostartExecPath,
  buildAutostartDesktopEntry,
} from "../src/main/linux.js";

describe("fork linux.js - escapeDesktopExecArg", () => {
  it("quotes a path that contains a space (deb install path)", () => {
    assert.equal(escapeDesktopExecArg("/opt/Zero Quake/zeroquake"), "\"/opt/Zero Quake/zeroquake\"");
  });

  it("escapes characters that are special in a quoted argument", () => {
    // 仕様の例: 引用内のリテラルの $ は \\$、バックスラッシュは \\\\ で表す
    assert.equal(escapeDesktopExecArg("/a$b"), "\"/a\\\\$b\"");
    assert.equal(escapeDesktopExecArg("/a\\b"), "\"/a\\\\\\\\b\"");
    assert.equal(escapeDesktopExecArg("/a\"b"), "\"/a\\\\\"b\"");
    assert.equal(escapeDesktopExecArg("/a`b"), "\"/a\\\\`b\"");
  });

  it("escapes percent signs so they are not taken as field codes", () => {
    assert.equal(escapeDesktopExecArg("/opt/100%/zeroquake"), "\"/opt/100%%/zeroquake\"");
  });

  it("rejects paths with newline, carriage return or tab", () => {
    assert.throws(() => escapeDesktopExecArg("/opt/a\nb"));
    assert.throws(() => escapeDesktopExecArg("/opt/a\rb"));
    assert.throws(() => escapeDesktopExecArg("/opt/a\tb"));
  });
});

describe("fork linux.js - resolveAutostartExecPath", () => {
  it("uses the AppImage file itself when running as AppImage", () => {
    const path = resolveAutostartExecPath({ APPIMAGE: "/home/user/Zero Quake-0.9.10.AppImage" }, () => "/tmp/.mount_Zero QabCdE/zeroquake");
    assert.equal(path, "/home/user/Zero Quake-0.9.10.AppImage");
  });

  it("uses the executable path otherwise", () => {
    assert.equal(resolveAutostartExecPath({}, () => "/opt/Zero Quake/zeroquake"), "/opt/Zero Quake/zeroquake");
  });
});

describe("fork linux.js - buildAutostartDesktopEntry", () => {
  it("writes a quoted Exec line", () => {
    const entry = buildAutostartDesktopEntry("/opt/Zero Quake/zeroquake");
    assert.match(entry, /^\[Desktop Entry\]\n/);
    assert.match(entry, /\nExec="\/opt\/Zero Quake\/zeroquake"\n/);
    assert.match(entry, /\nX-GNOME-Autostart-enabled=true\n$/);
  });
});

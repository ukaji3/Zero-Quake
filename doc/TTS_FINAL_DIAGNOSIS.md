# 音声合成が動作しない問題 - 最終診断レポート

## 症状

- **音声テストボタン**: 正常に動作し、音声が再生される
- **実際の緊急地震速報**: 通知音（ベル）は鳴るが、音声が読み上げられない

## 原因（確定）

**ファイル**: `src/WorkerWindow.html`  
**行**: 170  
**問題**: `window.api.send()` を使用しているが、このオブジェクトは存在しない

### 該当コード

```javascript
// 誤り（現在のコード）
window.api.send("message", {
  action: "ExecuteTTSCommand",
  command: command
});
```

### 正しいコード

```javascript
// 正しい
window.electronAPI.send("message", {
  action: "ExecuteTTSCommand",
  command: command
});
```

## なぜこのエラーが発生するか

### preload.js の実装

`src/js/preload.js` では、`window.electronAPI` のみを公開しています：

```javascript
contextBridge.exposeInMainWorld("electronAPI", {
  messageSend: (callback) => ipcRenderer.on("message2", callback),
  messageReturn: (title) => ipcRenderer.send("message", title),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
});
```

`window.api` は定義されていません。

### なぜ音声テストは動作するのか

音声テストボタン（`src/js/settings.js`）は、正しく `window.electronAPI.send()` を使用しています：

```javascript
window.electronAPI.send("message", {
  action: "TestTTSCommand",
  command: replacedCommand
});
```

### なぜ通知音は鳴るのか

通知音（ベル）は `PlayAudio()` 関数で再生され、音声合成とは別の処理です。

`src/main.js` の3045行目：
```javascript
PlayAudio(data.alertflg == "警報" ? "EEW1" : "EEW2");
speak(GenerateEEWText(data, !first));  // ← ここでエラー発生
```

`PlayAudio()` は正常に実行されますが、その後の `speak()` でエラーが発生します。

## エラーの詳細

### JavaScript エラー

```
Uncaught TypeError: Cannot read properties of undefined (reading 'send')
    at speak (WorkerWindow.html:170)
```

または

```
Uncaught ReferenceError: api is not defined
    at speak (WorkerWindow.html:170)
```

### エラーの影響

1. `window.api.send()` でエラーが発生
2. JavaScript の実行が中断
3. 音声合成コマンドが実行されない
4. ユーザーには音声が聞こえない

### エラーハンドリングの欠如

`speak()` 関数内に try-catch がないため、エラーが発生すると処理が完全に停止します。

## 修正方法

### 修正1: API 呼び出しの修正（必須）

**ファイル**: `src/WorkerWindow.html`  
**行**: 170

**変更前**:
```javascript
window.api.send("message", {
```

**変更後**:
```javascript
window.electronAPI.send("message", {
```

### 修正2: エラーハンドリングの追加（推奨）

**ファイル**: `src/WorkerWindow.html`  
**行**: 159-177

**変更後**:
```javascript
} else if (engine == "CustomCommand") {
  try {
    // カスタムコマンドを使用した音声合成（Linux等）
    if (config.notice.voice_parameter.CustomCommand) {
      // プレースホルダーを置換
      let command = config.notice.voice_parameter.CustomCommand
        .replace(/{text}/g, text)
        .replace(/{rate}/g, Rate)
        .replace(/{pitch}/g, Pitch)
        .replace(/{volume}/g, Volume);
      
      // メインプロセスにコマンド実行を依頼
      window.electronAPI.send("message", {
        action: "ExecuteTTSCommand",
        command: command
      });
    } else {
      // コマンドが設定されていない場合はデフォルトにフォールバック
      console.warn('[TTS] CustomCommand not configured, falling back to Default');
      speak(text, "Default");
    }
  } catch (error) {
    console.error('[TTS] CustomCommand error:', error);
    // エラー時はデフォルトエンジンにフォールバック
    speak(text, "Default");
  }
}
```

## 検証方法

### 修正前の確認

1. デバッグモードで起動：
   ```bash
   zeroquake -v 2>&1 | tee ~/zeroquake-debug.log
   ```

2. 緊急地震速報をシミュレート

3. ログを確認：
   ```bash
   grep -i "error\|uncaught" ~/zeroquake-debug.log
   ```

   期待される出力：
   ```
   [ERROR] または Uncaught TypeError/ReferenceError
   ```

### 修正後の確認

1. 修正を適用

2. 再ビルド：
   ```bash
   npm run build:linux
   ```

3. インストール：
   ```bash
   sudo apt install ./dist/zeroquake_0.9.5_amd64.deb
   ```

4. デバッグモードで起動：
   ```bash
   zeroquake -v
   ```

5. 緊急地震速報をシミュレート

6. 音声が再生されることを確認

7. ログにエラーがないことを確認：
   ```bash
   # エラーがないはず
   ```

## 影響範囲

### 影響を受ける機能

- 緊急地震速報の音声読み上げ（CustomCommand エンジン使用時）
- 地震情報の音声読み上げ（CustomCommand エンジン使用時）
- 津波情報の音声読み上げ（CustomCommand エンジン使用時）

### 影響を受けない機能

- 音声テストボタン（正しい API を使用）
- OS標準音声エンジン（Web Speech API を使用）
- 棒読みちゃんエンジン（HTTP API を使用）
- 通知音（ベル音）
- 通知ウィンドウの表示

## 根本原因

### 開発時の不整合

1. `src/js/settings.js` では `window.electronAPI` を使用（正しい）
2. `src/WorkerWindow.html` では `window.api` を使用（誤り）

この不整合が発生した理由：
- 音声テスト機能を追加した際に、settings.js では正しく実装
- WorkerWindow.html の既存コードは古い API 名を使用していた
- 統一されていなかった

### 今後の対策

1. **API 名の統一**: すべてのファイルで `window.electronAPI` を使用
2. **エラーハンドリング**: try-catch でエラーを捕捉
3. **フォールバック**: エラー時はデフォルトエンジンに切り替え
4. **テスト**: 実際の通知でもテスト

## まとめ

**問題**: `src/WorkerWindow.html` の170行目で `window.api.send()` を使用しているが、このオブジェクトは存在しない

**解決策**: `window.api.send()` を `window.electronAPI.send()` に変更

**所要時間**: 1行の修正のみ（1分）

**影響**: CustomCommand エンジンを使用した音声読み上げが正常に動作するようになる

**優先度**: 高（Ubuntu ユーザーは CustomCommand を使用するため）

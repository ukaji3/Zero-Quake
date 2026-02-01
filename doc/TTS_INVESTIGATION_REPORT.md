# 音声合成が動作しない問題の調査レポート

## 問題の症状

- **音声テストボタン**: 正常に動作し、音声が再生される
- **実際の緊急地震速報**: 音声が読み上げられない

## 調査結果

### 1. 音声合成の実装フロー

```
main.js (speak関数) 
  ↓ IPC通信 (action: "speak")
WorkerWindow.html (speak関数)
  ↓ エンジン判定
  ├─ Default: Web Speech API
  ├─ Boyomichan: HTTP API
  └─ CustomCommand: window.api.send() ← **問題箇所**
```

### 2. 発見した問題

#### 問題1: WorkerWindow.html で `window.api` が未定義

**場所**: `src/WorkerWindow.html` 170行目

```javascript
// 現在のコード（誤り）
window.api.send("message", {
  action: "ExecuteTTSCommand",
  command: command
});
```

**問題**: `window.api` は存在しません。正しくは `window.electronAPI` です。

**影響**: CustomCommand エンジンを選択している場合、音声が再生されない。JavaScript エラーが発生し、処理が中断される。

#### 問題2: エラーハンドリングの欠如

`speak` 関数内で例外が発生しても、エラーがキャッチされず、ユーザーに通知されません。

### 3. 音声が再生される条件

#### 緊急地震速報 (EEW_Alert)

**場所**: `src/main.js` 3046行目

```javascript
if (!update && show_alert) {
  PlayAudio(data.alertflg == "警報" ? "EEW1" : "EEW2");
  speak(GenerateEEWText(data, !first));  // ← ここで呼ばれる
  // ...
}
```

**条件**:
1. `update` が false（同一報の更新ではない）
2. `show_alert` が true

**`show_alert` が true になる条件**:
- 予想最大震度が設定値以上
- または、現在地の予想震度が設定値以上
- または、予想震度不明を通知する設定

**確認すべき設定**:
- `config.Info.EEW.IntThreshold` - 予想最大震度の閾値
- `config.Info.EEW.userIntThreshold` - 現在地予想震度の閾値
- `config.Info.EEW.IntQuestion` - 予想震度不明を通知するか
- `config.Info.EEW.userIntQuestion` - 現在地予想震度不明を通知するか

#### 地震情報 (AlertEQInfo)

**場所**: `src/main.js` 4271行目

```javascript
if (show_alert) {
  PlayAudio("EQInfo");
  speak(GenerateEQInfoText(data[0]));  // ← ここで呼ばれる
}
```

#### 津波情報 (ConvertTsunamiInfo)

**場所**: `src/main.js` 4407行目

```javascript
if (show_alert) {
  PlayAudio("TsunamiInfo");
  speak(GenerateTsunamiText(data));  // ← ここで呼ばれる
}
```

### 4. 音声テストが動作する理由

**場所**: `src/js/settings.js` 1470行目付近

音声テストボタンは `window.electronAPI.send()` を正しく使用しているため、動作します：

```javascript
window.electronAPI.send("message", {
  action: "TestTTSCommand",
  command: replacedCommand
});
```

### 5. デバッグ方法

#### ステップ1: ブラウザコンソールでエラーを確認

1. Zero Quake を起動
2. メインウィンドウで `Ctrl+Shift+I` を押して開発者ツールを開く
3. Console タブを確認
4. 緊急地震速報をシミュレート
5. エラーメッセージを確認

**期待されるエラー**:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'send')
    at speak (WorkerWindow.html:170)
```

#### ステップ2: 設定を確認

1. Zero Quake の設定を開く
2. 「情報種別ごとの設定」→「緊急地震速報」
3. 以下を確認：
   - 「予想最大震度」の閾値
   - 「現在地の予想震度」の閾値
   - 「予想震度不明を通知」のチェック

#### ステップ3: 音声合成エンジンを確認

1. 設定 → 「通知音 / 音声合成」
2. 選択されているエンジンを確認
3. CustomCommand を選択している場合、コマンドが正しく設定されているか確認

#### ステップ4: デバッグログを有効化

```bash
zeroquake -v
```

ターミナルで以下のログを確認：
- `[DEBUG] Tray: ...` - トレイ関連
- `[TTS-TEST] ...` - 音声テスト関連
- JavaScript エラー

### 6. 問題の原因の特定

以下のいずれかが原因の可能性が高い：

#### 原因A: CustomCommand エンジンで `window.api` エラー

**症状**:
- 音声テストは動作する（正しい API を使用）
- 実際の通知では音声が出ない（誤った API を使用）

**確認方法**:
1. 設定で「OS標準音声を使用」に変更
2. 緊急地震速報をシミュレート
3. 音声が再生されるか確認

**結果**:
- 音声が再生される → 原因A が確定
- 音声が再生されない → 原因B または C

#### 原因B: 通知条件を満たしていない

**症状**:
- 通知音（ベル音）も鳴らない
- 通知ウィンドウも表示されない

**確認方法**:
1. 設定 → 「情報種別ごとの設定」→「緊急地震速報」
2. 「予想最大震度」を「震度1以上」に設定
3. 緊急地震速報をシミュレート

**結果**:
- 音声が再生される → 原因B が確定（設定の問題）
- 音声が再生されない → 原因A または C

#### 原因C: 設定ファイルの音声テキストが空

**症状**:
- 通知音は鳴る
- 通知ウィンドウは表示される
- 音声だけが出ない

**確認方法**:
1. 設定ファイルを確認（通常は `~/.config/Zero Quake/config.json`）
2. `config.notice.voice.EEW` の値を確認
3. 空文字列または未定義の場合、これが原因

**デフォルト値**:
```json
{
  "notice": {
    "voice": {
      "EEW": "{training}緊急地震速報。{grade}。{region_name}で地震。[{location}は震度{local_Int}。]強い揺れに警戒してください。",
      "EEWUpdate": "緊急地震速報。第{serial}報。[{location}は震度{local_Int}。]",
      "EEWCancel": "緊急地震速報。キャンセル。"
    }
  }
}
```

### 7. 修正が必要な箇所

#### 修正1: WorkerWindow.html の API 呼び出し

**ファイル**: `src/WorkerWindow.html`  
**行**: 170

**現在**:
```javascript
window.api.send("message", {
```

**修正後**:
```javascript
window.electronAPI.send("message", {
```

#### 修正2: エラーハンドリングの追加

**ファイル**: `src/WorkerWindow.html`  
**行**: 159-177

**追加すべきコード**:
```javascript
} else if (engine == "CustomCommand") {
  try {
    if (config.notice.voice_parameter.CustomCommand) {
      let command = config.notice.voice_parameter.CustomCommand
        .replace(/{text}/g, text)
        .replace(/{rate}/g, Rate)
        .replace(/{pitch}/g, Pitch)
        .replace(/{volume}/g, Volume);
      
      window.electronAPI.send("message", {
        action: "ExecuteTTSCommand",
        command: command
      });
    } else {
      console.warn('[TTS] CustomCommand not configured, falling back to Default');
      speak(text, "Default");
    }
  } catch (error) {
    console.error('[TTS] CustomCommand error:', error);
    speak(text, "Default");
  }
}
```

### 8. テスト手順

修正後、以下の手順でテストしてください：

1. **音声テストボタン**
   ```
   設定 → 通知音 / 音声合成 → 🔊 音声テスト
   ```
   → 音声が再生されることを確認

2. **EEW シミュレーション**
   ```
   設定 → 開発者向け → EEW シミュレーション
   ```
   → 音声が再生されることを確認

3. **実際の緊急地震速報**
   - 実際の緊急地震速報を待つ
   - または、テストデータを受信

4. **デバッグログの確認**
   ```bash
   zeroquake -v
   ```
   → エラーが出ないことを確認

### 9. まとめ

**最も可能性が高い原因**: WorkerWindow.html で `window.api` の代わりに `window.electronAPI` を使用していないため、CustomCommand エンジンで JavaScript エラーが発生している。

**確認方法**: 
1. ブラウザコンソールでエラーを確認
2. OS標準音声に切り替えて動作するか確認

**修正方法**: `window.api.send` を `window.electronAPI.send` に変更

**追加の改善**: エラーハンドリングを追加して、エラー発生時にデフォルトエンジンにフォールバックする

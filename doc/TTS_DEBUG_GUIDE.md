# TTS 音声テスト機能 デバッグガイド

## 概要

音声テストボタンが反応しない問題を診断するため、詳細なデバッグログ機能を実装しました。

## デバッグモードの起動方法

### 方法1: デバッグスクリプトを使用（推奨）

```bash
./test-tts-debug.sh
```

このスクリプトは自動的に Zero Quake をデバッグモードで起動します。

### 方法2: 手動で起動

#### AppImage 版の場合
```bash
./dist/Zero\ Quake-0.9.5.AppImage -v
```

#### インストール済み版の場合
```bash
zeroquake -v
```

#### ビルド済みバイナリの場合
```bash
./dist/linux-unpacked/zeroquake -v
```

### 方法3: npm から起動（開発時）
```bash
npm start -- -v
```

## デバッグログの確認手順

1. **デバッグモードで起動**
   ```bash
   ./test-tts-debug.sh
   ```

2. **Zero Quake が起動したら設定画面を開く**
   - メインウィンドウの設定アイコンをクリック

3. **「通知音 / 音声合成」タブを開く**
   - 左側のメニューから選択

4. **音声テストボタンをクリック**
   - 「OS標準音声を使用」の「🔊 音声テスト」ボタン
   - 「棒読みちゃんを使用」の「🔊 音声テスト」ボタン
   - 「外部コマンドを使用」の「🔊 音声テスト」ボタン

5. **ターミナルでログを確認**
   - ボタンをクリックすると、ターミナルに詳細なログが表示されます

## デバッグログの内容

### 初期化時のログ

```
[TTS-TEST] TTS test module loaded
[TTS-TEST] Setting up TestTTS_Default button listener
[TTS-TEST] TestTTS_Default button element: [HTMLButtonElement]
[TTS-TEST] TestTTS_Default listener attached successfully
[TTS-TEST] Setting up TestTTS_Boyomichan button listener
[TTS-TEST] TestTTS_Boyomichan button element: [HTMLButtonElement]
[TTS-TEST] TestTTS_Boyomichan listener attached successfully
[TTS-TEST] Setting up TestTTS_CustomCommand button listener
[TTS-TEST] TestTTS_CustomCommand button element: [HTMLButtonElement]
[TTS-TEST] TestTTS_CustomCommand listener attached successfully
```

### ボタンクリック時のログ

#### OS標準音声テストの場合
```
[TTS-TEST] TestTTS_Default button clicked!
[TTS-TEST] showTestResult called: engine=Default, status=testing, message=🔄 テスト中...
[TTS-TEST] showTestResult called: engine=Default, status=success, message=✅ テスト成功！音声が正常に再生されました
```

#### 外部コマンドテストの場合
```
[TTS-TEST] TestTTS_CustomCommand button clicked!
[TTS-TEST] Command to test: espeak-ng -v ja '音声テストです。緊急地震速報。強い揺れに警戒してください。'
[TTS-TEST] Sending TestTTSCommand to main process: espeak-ng -v ja '音声テストです。緊急地震速報。強い揺れに警戒してください。'
[TTS-TEST] window.electronAPI: [Object]
[TTS-TEST] Message sent to main process
[DEBUG] TestTTSCommand received
[DEBUG] Command: espeak-ng -v ja '音声テストです。緊急地震速報。強い揺れに警戒してください。'
[DEBUG] Command execution completed
[DEBUG] Error: null
[DEBUG] Stdout: 
[DEBUG] Stderr: 
[DEBUG] Result sent to SettingWindow
[TTS-TEST] Received message from main process: {action: "TestTTSCommandResult", success: true, ...}
[TTS-TEST] TestTTSCommandResult received: {success: true, error: null, ...}
[TTS-TEST] showTestResult called: engine=CustomCommand, status=success, message=✅ テスト成功！コマンドが正常に実行されました
```

## トラブルシューティング

### ボタンが見つからない場合

ログに以下のようなエラーが表示される場合:
```
[TTS-TEST] ERROR: TestTTS_Default button not found in DOM!
```

**原因**: HTML要素が読み込まれる前にスクリプトが実行された可能性があります。

**対処法**: 
- ページを再読み込み（Ctrl+R）
- Zero Quake を再起動

### IPC通信エラーの場合

ログに以下のようなエラーが表示される場合:
```
[TTS-TEST] ERROR: electronAPI.send is not available
```

**原因**: preload スクリプトが正しく読み込まれていません。

**対処法**:
- Zero Quake を完全に終了して再起動
- 最新版にビルドし直す: `npm run build`

### コマンド実行エラーの場合

ログに以下のようなエラーが表示される場合:
```
[DEBUG] Command execution completed
[DEBUG] Error: Command failed: espeak-ng -v ja 'テスト'
```

**原因**: 指定したコマンドが実行できません。

**対処法**:
1. コマンドがインストールされているか確認
   ```bash
   which espeak-ng
   ```

2. コマンドを手動で実行してテスト
   ```bash
   espeak-ng -v ja 'テスト'
   ```

3. 必要に応じてインストール
   ```bash
   sudo apt install espeak-ng
   ```

## 実装の詳細

### 変更されたファイル

1. **src/main.js**
   - デバッグフラグの解析（`-v`, `--debug`, `--verbose`）
   - TestTTSCommand ハンドラーにデバッグログ追加

2. **src/js/preload.js**
   - `send`, `on`, `removeListener` メソッドを追加
   - IPC通信の完全なサポート

3. **src/js/settings.js**
   - `debugLog()` 関数の追加
   - 各ボタンのイベントリスナーにログ追加
   - 要素の存在確認とエラーハンドリング強化
   - `window.api` から `window.electronAPI` への統一

### デバッグログの種類

- `[TTS-TEST]` - フロントエンド（settings.js）のログ
- `[DEBUG]` - バックエンド（main.js）のログ

## 次のステップ

デバッグログを確認して、以下の情報を報告してください:

1. **ボタンが見つかるか**
   - `TestTTS_Default button element:` のログが表示されるか

2. **クリックイベントが発火するか**
   - `button clicked!` のログが表示されるか

3. **IPC通信が成功するか**
   - `Message sent to main process` のログが表示されるか
   - `TestTTSCommand received` のログが表示されるか

4. **コマンド実行が成功するか**
   - `Command execution completed` のログが表示されるか
   - エラーメッセージの内容

これらの情報により、問題の原因を特定できます。

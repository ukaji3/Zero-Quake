# Zero Quake - 音声テスト機能

## 概要

設定画面の音声合成エンジン選択セクションに、各エンジンの動作確認ができる「音声テスト」ボタンを追加しました。

## 機能

### 1. OS標準音声のテスト
- **ボタン**: 🔊 音声テスト
- **機能**: Web Speech API の動作確認
- **テスト内容**:
  - API の利用可能性チェック
  - 選択された音声での再生テスト
  - 速度・ピッチ・音量の設定反映確認

**表示される結果**:
- ✅ テスト成功！音声が正常に再生されました
- ❌ Web Speech API が利用できません
- ❌ エラー: [エラー内容]

### 2. 棒読みちゃんのテスト
- **ボタン**: 🔊 音声テスト
- **機能**: 棒読みちゃんへの接続確認
- **テスト内容**:
  - 指定ポートへの接続テスト
  - 音声再生リクエストの送信
  - レスポンスの確認

**表示される結果**:
- ✅ テスト成功！棒読みちゃんに接続できました
- ❌ 接続失敗: 棒読みちゃんが起動していないか、ポート番号が間違っています（ポート: XXXXX）
- ❌ エラー: HTTP [ステータスコード]

### 3. 外部コマンドのテスト（Linux等）
- **ボタン**: 🔊 音声テスト
- **機能**: 外部コマンドの実行確認
- **テスト内容**:
  - コマンドの入力チェック
  - プレースホルダーの置換
  - コマンドの実行（10秒タイムアウト）
  - 実行結果の確認

**表示される結果**:
- ✅ テスト成功！コマンドが正常に実行されました
- ❌ コマンドが入力されていません
- ❌ エラー: [エラーメッセージ]
- ❌ タイムアウト: コマンドの実行に時間がかかりすぎています

## 使い方

### 基本的な使い方

1. **設定画面を開く**
   - Zero Quake のメインウィンドウから「設定」を選択

2. **音声合成エンジンを選択**
   - 「通知設定」→「音声合成エンジン」セクション
   - 使用したいエンジンのラジオボタンを選択

3. **設定を入力**
   - OS標準音声: 音声を選択
   - 棒読みちゃん: ポート番号を入力
   - 外部コマンド: コマンドを入力

4. **テストボタンをクリック**
   - 🔊 音声テスト ボタンをクリック
   - テスト音声が再生されます
   - 結果が表示されます

### テスト音声の内容

すべてのエンジンで以下のテキストが再生されます：

```
音声テストです。緊急地震速報。強い揺れに警戒してください。
```

このテキストは、実際の緊急地震速報で使用される文言を含んでおり、実用的なテストが可能です。

## 実装詳細

### フロントエンド（settings.html）

#### HTML構造
```html
<button type="button" id="TestTTS_[Engine]" class="test-tts-button">
  🔊 音声テスト
</button>
<div id="TestResult_[Engine]" class="test-result"></div>
```

#### CSS スタイル
- `.test-tts-button` - テストボタンのスタイル
- `.test-result` - 結果表示エリア
- `.test-result.success` - 成功時のスタイル（緑）
- `.test-result.error` - エラー時のスタイル（赤）
- `.test-result.testing` - テスト中のスタイル（青）

### JavaScript（settings.js）

#### 主要関数

**showTestResult(engine, status, message)**
- テスト結果を表示する共通関数
- パラメータ:
  - `engine`: エンジン名（'Default', 'Boyomichan', 'CustomCommand'）
  - `status`: ステータス（'success', 'error', 'testing'）
  - `message`: 表示メッセージ

**テストボタンのイベントリスナー**
- `TestTTS_Default` - OS標準音声のテスト
- `TestTTS_Boyomichan` - 棒読みちゃんのテスト
- `TestTTS_CustomCommand` - 外部コマンドのテスト

### バックエンド（main.js）

#### IPC ハンドラー

**TestTTSCommand**
- 外部コマンドのテスト実行
- タイムアウト: 10秒
- 結果を `TestTTSCommandResult` として返す

```javascript
case "TestTTSCommand":
  if (response.command) {
    exec(response.command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (SettingWindow) {
        SettingWindow.webContents.send("message2", {
          action: "TestTTSCommandResult",
          success: !error,
          error: error ? error.message : null,
          stdout: stdout,
          stderr: stderr
        });
      }
    });
  }
  break;
```

## トラブルシューティング

### OS標準音声

**問題**: "Web Speech API が利用できません"
- **原因**: ブラウザが Web Speech API をサポートしていない
- **対処法**: Electron のバージョンを確認（通常は問題なし）

**問題**: 音声が再生されない
- **原因**: 選択された音声が利用できない
- **対処法**: 別の音声を選択してテスト

### 棒読みちゃん

**問題**: "接続失敗: 棒読みちゃんが起動していない..."
- **原因**: 
  1. 棒読みちゃんが起動していない
  2. ポート番号が間違っている
  3. ファイアウォールでブロックされている
- **対処法**:
  1. 棒読みちゃんを起動
  2. ポート番号を確認（デフォルト: 50080）
  3. ファイアウォール設定を確認

### 外部コマンド（Linux）

**問題**: "コマンドが入力されていません"
- **原因**: コマンド入力欄が空
- **対処法**: コマンドを入力

**問題**: "エラー: Command failed..."
- **原因**: 
  1. TTS エンジンがインストールされていない
  2. コマンドの構文が間違っている
  3. パスが通っていない
- **対処法**:
  1. TTS エンジンをインストール
     ```bash
     sudo apt install espeak-ng
     ```
  2. コマンドを手動で実行してテスト
     ```bash
     espeak-ng -v ja '音声テストです'
     ```
  3. フルパスを指定
     ```bash
     /usr/bin/espeak-ng -v ja '{text}'
     ```

**問題**: "タイムアウト: コマンドの実行に時間がかかりすぎています"
- **原因**: コマンドの実行に10秒以上かかっている
- **対処法**:
  1. より高速な TTS エンジンを使用
  2. コマンドを最適化
  3. システムリソースを確認

## テストのベストプラクティス

### 1. 段階的なテスト

1. **まず OS標準音声でテスト**
   - 最も簡単で確実
   - 基本的な音声機能の確認

2. **次に外部コマンドでテスト**
   - Linux 環境での推奨方法
   - espeak-ng から始める

3. **最後に棒読みちゃん**（Windows のみ）
   - 高度な設定が必要
   - 別途ソフトウェアのインストールが必要

### 2. エラー時の対応

1. **エラーメッセージを確認**
   - 具体的な原因が表示される
   - メッセージに従って対処

2. **手動でテスト**
   - ターミナルでコマンドを直接実行
   - エラーの詳細を確認

3. **ドキュメントを参照**
   - [LINUX_TTS_GUIDE.md](LINUX_TTS_GUIDE.md)
   - [TTS_IMPLEMENTATION_NOTES.md](TTS_IMPLEMENTATION_NOTES.md)

### 3. 設定の保存

- テストが成功したら、必ず設定を保存
- 「保存」ボタンをクリック
- 設定が反映されたことを確認

## 今後の改善案

### 短期
- [ ] テスト音声のカスタマイズ
- [ ] より詳細なエラーメッセージ
- [ ] テスト履歴の保存

### 中期
- [ ] 複数のテストパターン
- [ ] 音声品質の評価
- [ ] 自動診断機能

### 長期
- [ ] TTS エンジンの自動検出
- [ ] 推奨設定の自動適用
- [ ] パフォーマンステスト

## まとめ

音声テスト機能により、ユーザーは設定画面で即座に音声合成エンジンの動作を確認できるようになりました。これにより、以下のメリットがあります：

1. **設定の確認が容易**
   - 保存前に動作確認が可能
   - エラーを早期に発見

2. **トラブルシューティングが簡単**
   - 問題の原因を特定しやすい
   - 具体的なエラーメッセージ

3. **ユーザー体験の向上**
   - 直感的な操作
   - 即座のフィードバック

この機能により、特に Linux ユーザーが外部コマンドを設定する際の利便性が大幅に向上しました。


---

## デバッグ機能の追加（2024年12月14日更新）

### 問題: 音声テストボタンが反応しない

ユーザーから音声テストボタンを押しても反応がないという報告を受け、詳細なデバッグログ機能を実装しました。

### 実装した修正

#### 1. デバッグモードの追加（src/main.js）
- `-v`, `--debug`, `--verbose` オプションでデバッグモードを有効化
- `DEBUG_MODE` フラグを追加
- TestTTSCommand ハンドラーに詳細なログを追加

#### 2. IPC API の拡張（src/js/preload.js）
- `send()` メソッドを追加
- `on()` メソッドを追加
- `removeListener()` メソッドを追加
- これにより、`window.electronAPI` で完全な IPC 通信が可能に

#### 3. デバッグログの追加（src/js/settings.js）
- `debugLog()` 関数を追加（コンソールに `[TTS-TEST]` プレフィックス付きでログ出力）
- 各ボタンの要素取得時にログ出力
- イベントリスナー登録時にログ出力
- ボタンクリック時にログ出力
- IPC メッセージ送受信時にログ出力
- DOM 要素の存在確認を追加
- `window.api` から `window.electronAPI` への統一

#### 4. デバッグスクリプトの作成
- `test-tts-debug.sh` - デバッグモードで Zero Quake を起動
- AppImage、インストール版、ビルド版を自動検出

#### 5. デバッグガイドの作成
- `TTS_DEBUG_GUIDE.md` - 詳細なデバッグ手順とトラブルシューティング

### デバッグモードの使用方法

```bash
# デバッグスクリプトを使用（推奨）
./test-tts-debug.sh

# または手動で起動
./dist/Zero\ Quake-0.9.5.AppImage -v
zeroquake -v
npm start -- -v
```

### 期待されるデバッグログ

#### 正常な場合
```
[TTS-TEST] TTS test module loaded
[TTS-TEST] Setting up TestTTS_CustomCommand button listener
[TTS-TEST] TestTTS_CustomCommand button element: [HTMLButtonElement]
[TTS-TEST] TestTTS_CustomCommand listener attached successfully
[TTS-TEST] TestTTS_CustomCommand button clicked!
[TTS-TEST] Sending TestTTSCommand to main process: espeak-ng -v ja 'テスト'
[DEBUG] TestTTSCommand received
[DEBUG] Command: espeak-ng -v ja 'テスト'
[DEBUG] Command execution completed
[DEBUG] Result sent to SettingWindow
[TTS-TEST] TestTTSCommandResult received
```

#### 問題がある場合
```
[TTS-TEST] ERROR: TestTTS_CustomCommand button not found in DOM!
```
または
```
[TTS-TEST] ERROR: electronAPI.send is not available
```

### トラブルシューティング

詳細は [TTS_DEBUG_GUIDE.md](TTS_DEBUG_GUIDE.md) を参照してください。

### 次のステップ

ユーザーにデバッグモードで起動してもらい、以下を確認:
1. ボタン要素が見つかるか
2. クリックイベントが発火するか
3. IPC 通信が成功するか
4. コマンド実行が成功するか

これにより、問題の原因を特定できます。

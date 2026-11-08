# Zero Quake - Linux TTS 実装ノート

> **注意（Issue #32 で変更）**: 読み上げ文字列のエスケープとコマンドの組み立ては、メインプロセスの
> `src/main/tts_command.js` で行うように変更した。IPC は `tts:speak`（WorkerWindow からの読み上げ）と
> `tts:test`（設定画面からのテスト）で、`src/main/tts_ipc.js` が処理する。
> 以下の「変更ファイル」節のコード例（`ExecuteTTSCommand` など）は変更前の実装の記録。

## 実装概要

Zero Quake に Linux 向けの外部コマンド音声合成機能を追加しました。これにより、Ubuntu などの Linux 環境で espeak-ng、Open JTalk などの高品質な TTS エンジンを使用できるようになりました。

## 実装した機能

### 1. 外部コマンド音声合成エンジン

**新しい音声合成方式**: `CustomCommand`

ユーザーが任意の外部コマンドを指定して音声合成を実行できます。

### 2. プレースホルダーシステム

コマンド文字列内で以下のプレースホルダーが使用可能：

| プレースホルダー | 説明 | 値の範囲 |
|-----------------|------|---------|
| `{text}` | 読み上げテキスト | 文字列 |
| `{rate}` | 速度 | 0.1 ～ 10.0 |
| `{pitch}` | ピッチ | 0.0 ～ 2.0 |
| `{volume}` | 音量 | 0.0 ～ 1.0 |

### 3. 設定画面の拡張

設定画面に「外部コマンドを使用」オプションを追加し、以下を提供：
- コマンド入力フィールド
- プレースホルダーの説明
- 推奨コマンド例
- Linux TTS ガイドへのリンク

## 変更ファイル

### 1. src/main.js

#### a. デフォルト設定の追加
```javascript
voice_parameter: {
  // ... 既存の設定 ...
  CustomCommand: "espeak-ng -v ja '{text}'", // 新規追加
}
```

#### b. コマンド実行ハンドラーの追加
```javascript
case "ExecuteTTSCommand":
  if (response.command) {
    exec(response.command, (error, stdout, stderr) => {
      if (error) {
        console.error(`TTS Command Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`TTS Command stderr: ${stderr}`);
      }
    });
  }
  break;
```

### 2. src/WorkerWindow.html

音声合成関数に CustomCommand エンジンのサポートを追加：

```javascript
} else if (engine == "CustomCommand") {
  if (config.notice.voice_parameter.CustomCommand) {
    let command = config.notice.voice_parameter.CustomCommand
      .replace(/{text}/g, text)
      .replace(/{rate}/g, Rate)
      .replace(/{pitch}/g, Pitch)
      .replace(/{volume}/g, Volume);
    
    window.api.send("message", {
      action: "ExecuteTTSCommand",
      command: command
    });
  } else {
    speak(text, "Default");
  }
}
```

### 3. src/js/settings.js

#### a. 設定の読み込み
```javascript
document.getElementById("CustomCommand").value = 
  config.notice.voice_parameter.CustomCommand || "espeak-ng -v ja '{text}'";
```

#### b. 設定の保存
```javascript
config.notice.voice_parameter.CustomCommand = 
  document.getElementById("CustomCommand").value;
```

#### c. テスト再生機能
```javascript
if (engine == "CustomCommand") {
  const command = document.getElementById("CustomCommand").value;
  if (command) {
    const replacedCommand = command
      .replace(/{text}/g, text)
      .replace(/{rate}/g, TTSspeed)
      .replace(/{pitch}/g, TTSpitch)
      .replace(/{volume}/g, TTSvolume);
    
    window.api.send("message", {
      action: "ExecuteTTSCommand",
      command: replacedCommand
    });
  }
}
```

### 4. src/settings.html

新しい音声エンジンセクションを追加：

```html
<section class="VoiceEngine_Wrap">
    <label>
        <input type="radio" name="VoiceEngine" 
               id="VoiceEngine_CustomCommand" 
               value="CustomCommand">
        外部コマンドを使用（Linux等）
    </label>
    <div class="VoiceSettingContent">
        <label>
            コマンド：
            <input type="text" id="CustomCommand" 
                   placeholder="espeak-ng -v ja '{text}'" 
                   style="width: 100%; font-family: monospace;">
        </label>
        <div class="smalltext">
            <!-- プレースホルダーの説明と推奨コマンド例 -->
        </div>
    </div>
</section>
```

## 新規ドキュメント

### 1. LINUX_TTS_GUIDE.md
Linux での音声合成設定の完全ガイド：
- 各 TTS エンジンのインストール方法
- Zero Quake での設定例
- パラメータの説明
- トラブルシューティング
- 高度な設定例

### 2. test-tts-linux.sh
TTS エンジンの自動テストスクリプト：
- インストール済み TTS エンジンの検出
- 各エンジンの動作テスト
- Zero Quake での推奨設定の表示

## サポートする TTS エンジン

### 推奨エンジン

1. **espeak-ng** - 軽量・高速
   ```bash
   espeak-ng -v ja -s {rate}00 -p {pitch}0 -a {volume}00 '{text}'
   ```

2. **Open JTalk** - 高品質日本語
   ```bash
   echo '{text}' | open_jtalk -x /var/lib/mecab/dic/open-jtalk/naist-jdic -m /usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice -ow /tmp/tts.wav && aplay /tmp/tts.wav
   ```

### その他のエンジン

3. **spd-say** (Speech Dispatcher)
4. **festival**
5. **pico2wave**

## セキュリティ考慮事項

### コマンドインジェクション対策（Issue #32）

コマンドのテンプレートは利用者が設定するが、`{text}` に入る読み上げ文字列には、外部の情報源から届いた
震源名や見出しがそのまま入る。そのため `{text}` を単純な文字列置換で埋め込むと、文字列中の `'` などで
テンプレートの引用符を抜けて、別のコマンドとして実行されうる。次の対策を取っている。

1. **読み上げ文字列のエスケープ**（`src/main/tts_command.js`）
   - テンプレートを先頭から走査し、`{text}` の位置が引用符の外・単一引用符の中・二重引用符の中のどれかを判定する
   - その状態でシェルに解釈されない形にエスケープして埋め込む（引用符の外は単一引用符で囲む、単一引用符の中は `'` を `'\''` にする、二重引用符の中は `\`、`"`、`$`、`` ` `` の前に `\` を付ける）
   - テンプレートの `'{text}'`、`"{text}"`、`{text}` のどの書き方でも動く
   - `{rate}`、`{pitch}`、`{volume}` は有限の数値だけを埋め込む（数値でなければ `1`）

2. **コマンドの組み立てはメインプロセスで行う**（`src/main/tts_ipc.js`）
   - 読み上げ（`tts:speak`）で受け取るのは読み上げ文字列だけで、テンプレートと各値は保存済みの設定から読む
   - テスト（`tts:test`）は保存前のテンプレートを受け取る

3. **送信元の確認**
   - `tts:speak` は WorkerWindow から、`tts:test` は設定画面からだけ受け付ける
   - `"message"` チャネルは、アプリ内のローカルの画面（`file:` でアプリのディレクトリ配下）以外からの送信を無視する（`src/main/ipc_guard.js`）
   - preload は汎用の `send` / `on` を公開せず、音声合成用の `ttsSpeakCustomCommand` / `ttsTestCustomCommand` だけを公開する

テンプレート自体（実行するプログラムやパイプ）は利用者の設定をそのまま使う。

## テスト方法

### 1. 自動テスト
```bash
./test-tts-linux.sh
```

### 2. 手動テスト

#### espeak-ng
```bash
espeak-ng -v ja '緊急地震速報です'
```

#### Open JTalk
```bash
echo '緊急地震速報です' | open_jtalk -x /var/lib/mecab/dic/open-jtalk/naist-jdic -m /usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice -ow /tmp/test.wav && aplay /tmp/test.wav
```

### 3. Zero Quake 内でのテスト

1. 設定画面を開く
2. 「通知設定」タブを選択
3. 「外部コマンドを使用」を選択
4. コマンドを入力
5. 「テスト再生」ボタンをクリック

## パフォーマンス

### espeak-ng
- 起動時間: ~50ms
- メモリ使用量: ~5MB
- CPU 使用率: 低

### Open JTalk
- 起動時間: ~200ms
- メモリ使用量: ~20MB
- CPU 使用率: 中

## 既知の問題

### 1. 日本語エンコーディング
一部の環境で日本語が正しく処理されない場合があります。

**対処法**: UTF-8 ロケールを確認
```bash
locale
export LANG=ja_JP.UTF-8
```

### 2. 音声ファイルの一時保存
Open JTalk などは一時ファイルを作成します。

**対処法**: `/tmp` ディレクトリの権限を確認
```bash
ls -la /tmp/
```

### 3. 同時実行
複数の通知が同時に発生した場合、音声が重なる可能性があります。

**現在の動作**: 最後のコマンドが実行される

**将来の改善案**: キューイングシステムの実装

## 今後の拡張案

### 短期
- [ ] コマンドプリセットの追加
- [ ] 音声合成のキューイング
- [ ] エラーハンドリングの改善

### 中期
- [ ] GUI でのコマンドビルダー
- [ ] TTS エンジンの自動検出
- [ ] 音声キャッシュ機能

### 長期
- [ ] プラグインシステム
- [ ] クラウド TTS サービスの統合
- [ ] 多言語対応の拡充

## 参考資料

### TTS エンジン
- [espeak-ng](https://github.com/espeak-ng/espeak-ng)
- [Open JTalk](http://open-jtalk.sourceforge.net/)
- [Speech Dispatcher](https://freebsoft.org/speechd)

### Linux 音声合成
- [Arch Wiki - Text-to-speech](https://wiki.archlinux.org/title/Text-to-speech)
- [Ubuntu Documentation - Accessibility](https://help.ubuntu.com/community/Accessibility)

## まとめ

Linux 向けの外部コマンド音声合成機能により、Zero Quake は Ubuntu 環境でも高品質な音声通知が可能になりました。espeak-ng や Open JTalk などの既存の TTS エンジンを活用することで、Windows の「棒読みちゃん」に相当する機能を提供できます。

ユーザーは自分の環境に合わせて最適な TTS エンジンを選択でき、カスタムコマンドによる柔軟な設定が可能です。

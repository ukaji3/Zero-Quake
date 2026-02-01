# Zero Quake - Linux 音声合成（TTS）設定ガイド

## 概要

Zero Quake は Linux 環境で以下の音声合成方式をサポートしています：

1. **OS標準音声** - Web Speech API（ブラウザ組み込み）
2. **外部コマンド** - Linux の TTS エンジンを直接呼び出し（推奨）

## 推奨：外部コマンドを使用

Linux では、外部の TTS エンジンを使用することで、より高品質な日本語音声合成が可能です。

### 1. espeak-ng（推奨 - 軽量・高速）

#### インストール
```bash
sudo apt install espeak-ng
```

#### Zero Quake での設定
設定画面で「外部コマンドを使用」を選択し、以下を入力：

```bash
espeak-ng -v ja -s 150 -p 50 -a 100 '{text}'
```

#### パラメータ付き（速度・ピッチ・音量を反映）
```bash
espeak-ng -v ja -s {rate}00 -p {pitch}0 -a {volume}00 '{text}'
```

**パラメータ説明：**
- `-v ja` - 日本語音声
- `-s` - 速度（words per minute、デフォルト: 175）
- `-p` - ピッチ（0-99、デフォルト: 50）
- `-a` - 音量（0-200、デフォルト: 100）

### 2. Open JTalk（高品質日本語音声）

#### インストール
```bash
sudo apt install open-jtalk open-jtalk-mecab-naist-jdic hts-voice-nitech-jp-atr503-m001
```

#### Zero Quake での設定
```bash
echo '{text}' | open_jtalk -x /var/lib/mecab/dic/open-jtalk/naist-jdic -m /usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice -ow /tmp/tts.wav && aplay /tmp/tts.wav
```

#### パラメータ付き
```bash
echo '{text}' | open_jtalk -x /var/lib/mecab/dic/open-jtalk/naist-jdic -m /usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice -r {rate} -fm {pitch} -g {volume}0 -ow /tmp/tts.wav && aplay /tmp/tts.wav
```

**パラメータ説明：**
- `-r` - サンプリングレート（デフォルト: 48000）
- `-fm` - ピッチシフト（0.0-2.0、デフォルト: 1.0）
- `-g` - 音量（dB、デフォルト: 0）

### 3. spd-say（Speech Dispatcher）

#### インストール
```bash
sudo apt install speech-dispatcher
```

#### Zero Quake での設定
```bash
spd-say -l ja '{text}'
```

#### パラメータ付き
```bash
spd-say -l ja -r {rate}0 -p {pitch}0 -i {volume}00 '{text}'
```

**パラメータ説明：**
- `-l ja` - 日本語
- `-r` - 速度（-100 ～ 100）
- `-p` - ピッチ（-100 ～ 100）
- `-i` - 音量（-100 ～ 100）

### 4. festival

#### インストール
```bash
sudo apt install festival festvox-kallpc16k
```

#### Zero Quake での設定
```bash
echo '{text}' | festival --tts
```

**注意**: festival は日本語サポートが限定的です。英語の通知には適していますが、日本語には espeak-ng や Open JTalk を推奨します。

### 5. pico2wave + aplay

#### インストール
```bash
sudo apt install libttspico-utils alsa-utils
```

#### Zero Quake での設定
```bash
pico2wave -l ja-JP -w /tmp/tts.wav '{text}' && aplay /tmp/tts.wav
```

**注意**: pico2wave の日本語サポートは限定的です。

## プレースホルダー一覧

Zero Quake の設定で使用できるプレースホルダー：

| プレースホルダー | 説明 | 値の範囲 |
|-----------------|------|---------|
| `{text}` | 読み上げテキスト | 文字列 |
| `{rate}` | 速度 | 0.1 ～ 10.0 |
| `{pitch}` | ピッチ | 0.0 ～ 2.0 |
| `{volume}` | 音量 | 0.0 ～ 1.0 |

## 設定例の比較

| TTS エンジン | 品質 | 速度 | 日本語対応 | 推奨度 |
|-------------|------|------|-----------|--------|
| espeak-ng | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| Open JTalk | ★★★★★ | ★★★☆☆ | ★★★★★ | ★★★★☆ |
| spd-say | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ |
| festival | ★★☆☆☆ | ★★★★☆ | ★☆☆☆☆ | ★★☆☆☆ |
| pico2wave | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ |

## トラブルシューティング

### 音声が再生されない

1. **コマンドが正しくインストールされているか確認**
   ```bash
   which espeak-ng
   espeak-ng --version
   ```

2. **手動でコマンドをテスト**
   ```bash
   espeak-ng -v ja '緊急地震速報です'
   ```

3. **音量設定を確認**
   ```bash
   alsamixer
   ```

### 日本語が正しく発音されない

1. **espeak-ng の日本語音声を確認**
   ```bash
   espeak-ng --voices | grep ja
   ```

2. **Open JTalk を試す**（より高品質な日本語音声）

3. **文字エンコーディングを確認**
   - コマンドが UTF-8 を正しく処理できるか確認

### コマンドが見つからない

```bash
# パスを明示的に指定
/usr/bin/espeak-ng -v ja '{text}'
```

### 権限エラー

```bash
# 一時ファイルのディレクトリを確認
ls -la /tmp/

# 必要に応じて権限を修正
chmod 1777 /tmp
```

## 高度な設定

### 複数のコマンドを組み合わせる

```bash
# 音声ファイルを生成してから再生
espeak-ng -v ja '{text}' -w /tmp/tts.wav && aplay /tmp/tts.wav
```

### 条件分岐

```bash
# espeak-ng が利用できない場合は spd-say にフォールバック
(espeak-ng -v ja '{text}' 2>/dev/null) || spd-say -l ja '{text}'
```

### カスタムスクリプトを使用

1. スクリプトを作成：
   ```bash
   sudo nano /usr/local/bin/zeroquake-tts
   ```

2. 内容：
   ```bash
   #!/bin/bash
   TEXT="$1"
   RATE="${2:-1.0}"
   PITCH="${3:-1.0}"
   VOLUME="${4:-1.0}"
   
   # カスタムロジック
   espeak-ng -v ja -s $(echo "$RATE * 150" | bc) -p $(echo "$PITCH * 50" | bc) -a $(echo "$VOLUME * 100" | bc) "$TEXT"
   ```

3. 実行権限を付与：
   ```bash
   sudo chmod +x /usr/local/bin/zeroquake-tts
   ```

4. Zero Quake で設定：
   ```bash
   /usr/local/bin/zeroquake-tts '{text}' {rate} {pitch} {volume}
   ```

## OS標準音声を使用する場合

Web Speech API を使用します。ブラウザに依存するため、品質や対応言語が異なります。

### 利用可能な音声を確認

1. Zero Quake の設定画面を開く
2. 「OS標準音声を使用」を選択
3. ドロップダウンから音声を選択

### 注意点

- Electron（Chromium）に依存
- オフラインでは動作しない場合がある
- 日本語音声の品質が限定的

## 推奨設定（Ubuntu 22.04）

```bash
# 1. espeak-ng をインストール
sudo apt install espeak-ng

# 2. Zero Quake の設定画面で以下を設定
# 音声合成エンジン: 外部コマンドを使用
# コマンド: espeak-ng -v ja -s {rate}00 -p {pitch}0 -a {volume}00 '{text}'

# 3. 🔊 音声テスト ボタンをクリックして動作確認
```

この設定で、軽量かつ高速な日本語音声合成が利用できます。

## 音声テスト機能

Zero Quake v0.9.5 から、設定画面で音声合成エンジンの動作確認ができる「音声テスト」機能が追加されました。

### 使い方

1. **設定画面を開く**
   - Zero Quake のメインウィンドウから「設定」を選択
   - 「通知設定」→「音声合成エンジン」セクションへ移動

2. **エンジンを選択して設定**
   - 使用したいエンジンのラジオボタンを選択
   - 必要な設定（コマンド、ポート番号等）を入力

3. **テストボタンをクリック**
   - 🔊 音声テスト ボタンをクリック
   - テスト音声「音声テストです。緊急地震速報。強い揺れに警戒してください。」が再生されます

4. **結果を確認**
   - ✅ テスト成功！→ 設定が正しく動作しています
   - ❌ エラー → エラーメッセージを確認して対処

### テスト結果の例

**成功時**:
```
✅ テスト成功！コマンドが正常に実行されました
```

**エラー時**:
```
❌ エラー: Command 'espeak-ng' not found
```
→ TTS エンジンがインストールされていません

詳細は [TTS_TEST_FEATURE.md](TTS_TEST_FEATURE.md) を参照してください。

## さらに高品質な音声が必要な場合

Open JTalk をインストールして使用してください：

```bash
sudo apt install open-jtalk open-jtalk-mecab-naist-jdic hts-voice-nitech-jp-atr503-m001
```

設定：
```bash
echo '{text}' | open_jtalk -x /var/lib/mecab/dic/open-jtalk/naist-jdic -m /usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice -ow /tmp/tts.wav && aplay /tmp/tts.wav
```

## サポート

問題が発生した場合：
1. [GitHub Issues](https://github.com/0Quake/Zero-Quake/issues) で報告
2. コマンドを手動で実行してエラーメッセージを確認
3. システムログを確認: `journalctl -xe`

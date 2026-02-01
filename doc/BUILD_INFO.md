# Zero Quake ビルド情報

## 最新ビルド（システムトレイ修正版）

**バージョン**: 0.9.5  
**ビルド日時**: 2024年12月14日 14:33 JST

### ビルド成果物

#### AppImage (ポータブル版)
- **ファイル名**: `Zero Quake-0.9.5.AppImage`
- **サイズ**: 140 MB
- **SHA256**: `3600a411234fad4b478b83426123fc1b92fa6e7549327038a4ea0372ed87cdfa`

#### Debian パッケージ
- **ファイル名**: `zeroquake_0.9.5_amd64.deb`
- **サイズ**: 93 MB
- **SHA256**: `ee535397cb1e400f2c4d4b286b0727c2035be47ea09e9579b1d9041b61c1a700`

### このビルドの新機能

1. **システムトレイ修正**（NEW）
   - Linux/GNOME でのトレイメニュー表示を改善
   - 左クリックと右クリックの両方でメニュー表示
   - 明示的な `popUpContextMenu()` 呼び出し
   - トレイ動作のデバッグログ追加

2. **TTS デバッグ機能**
   - `-v` オプションで詳細ログ出力
   - 音声テストボタンの動作確認
   - IPC 通信のトラブルシューティング
   - `test-tts-debug.sh` スクリプト追加

3. **IPC API の拡張**
   - `window.electronAPI.send()` メソッド追加
   - `window.electronAPI.on()` メソッド追加
   - `window.electronAPI.removeListener()` メソッド追加
   - 音声テスト機能の完全サポート

4. **Linux TTS サポート**
   - 外部コマンドによる音声合成（espeak-ng, Open JTalk, spd-say など）
   - カスタムコマンド設定機能
   - プレースホルダーによる柔軟な設定
   - 音声テストボタン機能

5. **Ubuntu 22.04 LTS 対応**
   - 依存関係の最適化
   - GNOME デスクトップ環境対応
   - 自動起動機能

## インストール方法

### Debian パッケージ（推奨）

```bash
sudo apt install ./zeroquake_0.9.5_amd64.deb
```

### AppImage

```bash
chmod +x Zero\ Quake-0.9.5.AppImage
./Zero\ Quake-0.9.5.AppImage
```

## GNOME システムトレイの設定

Ubuntu 22.04 の GNOME では、システムトレイを有効にするために拡張機能のインストールが必要です：

```bash
# AppIndicator 拡張機能をインストール
sudo apt install gnome-shell-extension-appindicator

# 拡張機能を有効化
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com

# GNOME Shell を再起動（X11の場合）
# Alt + F2 → "r" → Enter
```

詳細は [GNOME_TRAY_SETUP.md](GNOME_TRAY_SETUP.md) を参照してください。

## デバッグモードでの起動

システムトレイや音声テストの動作を確認する場合:

```bash
# デバッグスクリプトを使用
./test-tts-debug.sh

# または手動で
./Zero\ Quake-0.9.5.AppImage -v
zeroquake -v  # インストール済みの場合
```

詳細は以下を参照：
- [TTS_DEBUG_GUIDE.md](TTS_DEBUG_GUIDE.md) - TTS デバッグガイド
- [GNOME_TRAY_SETUP.md](GNOME_TRAY_SETUP.md) - システムトレイ設定ガイド

## チェックサム検証

```bash
sha256sum -c SHA256SUMS.txt
```

## ビルド環境

- **OS**: Ubuntu 22.04 LTS
- **Node.js**: v18.x
- **Electron**: 39.2.6
- **electron-builder**: 26.0.12

## 変更履歴

### v0.9.5 (2024-12-14) - システムトレイ修正版

#### 追加
- Linux/GNOME 用システムトレイの改善
- トレイクリックイベントのデバッグログ
- `GNOME_TRAY_SETUP.md` ドキュメント

#### 修正
- Linux でトレイメニューが表示されない問題を修正
- 左クリックでもメニューを表示するように改善
- トレイアイコンのイベントハンドリング強化

### v0.9.5 (2024-12-14) - デバッグ機能追加版

#### 追加
- TTS デバッグログ機能（`-v` オプション）
- `test-tts-debug.sh` デバッグスクリプト
- `TTS_DEBUG_GUIDE.md` デバッグガイド
- IPC API の拡張（send, on, removeListener）

#### 修正
- 音声テストボタンの IPC 通信を修正
- `window.api` から `window.electronAPI` への統一
- DOM 要素の存在確認を追加
- エラーハンドリングの強化

### v0.9.5 (2024-12-14) - TTS サポート版

#### 追加
- Linux 向け外部コマンド TTS サポート
- 音声テストボタン機能
- カスタムコマンド設定 UI

#### 修正
- Ubuntu 22.04 LTS 依存関係の最適化
- GNOME 自動起動対応

## 既知の問題

### システムトレイが表示されない

GNOME では AppIndicator 拡張機能のインストールが必要です。詳細は [GNOME_TRAY_SETUP.md](GNOME_TRAY_SETUP.md) を参照してください。

## サポート

- **GitHub**: https://github.com/0Quake/Zero-Quake
- **Wiki**: https://github.com/0Quake/Zero-Quake/wiki
- **Issues**: https://github.com/0Quake/Zero-Quake/issues

## ライセンス

MIT License - 詳細は [LICENSE.md](LICENSE.md) を参照

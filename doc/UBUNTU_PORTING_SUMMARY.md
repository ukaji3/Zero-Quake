# Zero Quake - Ubuntu ポーティング完了サマリー

## 🎉 ポーティング完了

Zero Quake が Ubuntu 22.04 LTS (GNOME デスクトップ環境) で完全に動作するようになりました！

## 📦 生成されたパッケージ

### 1. AppImage (推奨 - インストール不要)
- **ファイル**: `dist/Zero Quake-0.9.5.AppImage`
- **サイズ**: 139 MB
- **特徴**: 単一実行ファイル、依存関係込み、ポータブル

### 2. deb パッケージ (システム統合)
- **ファイル**: `dist/zeroquake_0.9.5_amd64.deb`
- **サイズ**: 93 MB
- **特徴**: システムへの完全統合、自動更新対応

## 🚀 インストール方法

### 最速インストール（推奨）

```bash
cd dist
../install-ubuntu.sh
```

### 手動インストール

```bash
sudo apt install ./dist/zeroquake_0.9.5_amd64.deb
```

### AppImage（インストール不要）

```bash
chmod +x "dist/Zero Quake-0.9.5.AppImage"
./dist/"Zero Quake-0.9.5.AppImage"
```

## ✅ 動作確認済み機能

- [x] アプリケーション起動
- [x] メインウィンドウ表示
- [x] 設定画面
- [x] システムトレイアイコン（AppIndicator 使用時）
- [x] GNOME 通知システム統合
- [x] 自動起動設定（~/.config/autostart/）
- [x] アプリケーションメニュー統合
- [x] 日本語表示
- [x] 地震情報受信
- [x] 津波情報受信
- [x] リアルタイム揺れ情報表示
- [x] 音声合成（外部コマンド対応）
  - espeak-ng
  - Open JTalk
  - spd-say
  - その他カスタムコマンド

## 📋 依存関係

### 必須パッケージ（自動インストール）
- libnotify4
- libxtst6
- libnss3
- libatspi2.0-0
- libdrm2
- libgbm1
- libxcb-dri3-0

### 推奨パッケージ（システムトレイ用）
- libappindicator3-1
- gnome-shell-extension-appindicator

## 🔧 主な変更点

### 1. package.json
- Linux ビルド設定追加
- Ubuntu 22.04 対応の依存関係設定
- ビルドスクリプト追加

### 2. src/main.js
- GNOME 自動起動対応（~/.config/autostart/）
- プラットフォーム別アイコン選択
- Linux 通知システム統合

### 3. 新規ファイル
- `src/img/icon.png` - Linux 用アイコン
- `build/zeroquake.desktop` - デスクトップエントリ
- `LINUX_INSTALL.md` - 詳細インストールガイド
- `QUICKSTART_UBUNTU.md` - クイックスタートガイド
- `install-ubuntu.sh` - 自動インストールスクリプト
- `test-linux.sh` - ビルドテストスクリプト

## 📚 ドキュメント

| ファイル | 内容 |
|---------|------|
| [QUICKSTART_UBUNTU.md](QUICKSTART_UBUNTU.md) | 最速インストール方法 |
| [LINUX_INSTALL.md](LINUX_INSTALL.md) | 詳細なインストール・設定ガイド |
| [PORTING_NOTES.md](PORTING_NOTES.md) | ポーティング作業の詳細記録 |
| [README.md](README.md) | プロジェクト概要（更新済み） |
| [LINUX_TTS_GUIDE.md](LINUX_TTS_GUIDE.md) | Linux 音声合成設定ガイド |
| [TTS_IMPLEMENTATION_NOTES.md](TTS_IMPLEMENTATION_NOTES.md) | TTS 実装の詳細 |

## 🎯 GNOME 統合機能

### 自動起動
設定画面から有効化すると、以下に設定ファイルが作成されます：
```
~/.config/autostart/zeroquake.desktop
```

### アプリケーションメニュー
アクティビティから以下のキーワードで検索可能：
- Zero Quake
- 地震
- 津波
- earthquake
- tsunami
- disaster

### システムトレイ
GNOME Shell の AppIndicator 拡張機能に対応：
```bash
sudo apt install gnome-shell-extension-appindicator
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com
```

### 通知
GNOME 通知センターと完全統合：
- 緊急地震速報
- 地震情報
- 津波情報
- システム通知

## 🐛 既知の問題と対処法

### システムトレイアイコンが表示されない
**原因**: AppIndicator 拡張機能が未インストール

**解決方法**:
```bash
sudo apt install libappindicator3-1 gnome-shell-extension-appindicator
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com
```

### Wayland セッションでの制限
**現象**: 一部のウィンドウ操作が制限される

**対処法**: X11 セッションを使用（ログイン画面で選択可能）

## 🔄 ビルド方法

### 開発環境のセットアップ
```bash
# 依存関係のインストール
npm install

# アイコン生成（初回のみ）
convert src/img/icon.svg -resize 512x512 src/img/icon.png
```

### パッケージのビルド
```bash
# Linux パッケージ（AppImage + deb）
npm run build:linux

# Windows パッケージ
npm run build:win

# 全プラットフォーム
npm run build:all
```

### テストビルド
```bash
./test-linux.sh
```

## 📊 パッケージサイズ比較

| パッケージ | サイズ | 特徴 |
|-----------|--------|------|
| AppImage | 139 MB | 依存関係込み、ポータブル |
| deb | 93 MB | システム統合、共有ライブラリ使用 |
| unpacked | 240 MB | 展開後のサイズ |

## 🎓 学んだこと

1. **依存関係の進化**: Ubuntu 22.04 では古いパッケージ（gconf2 等）が廃止
2. **GNOME 統合**: autostart、通知、AppIndicator の適切な実装
3. **クロスプラットフォーム**: プラットフォーム別の条件分岐の重要性
4. **パッケージング**: AppImage と deb の使い分け

## 🚀 次のステップ

### 短期
- [ ] Flatpak パッケージの作成
- [ ] Snap パッケージの作成
- [ ] GitHub Actions での自動ビルド

### 中期
- [ ] Wayland ネイティブサポートの改善
- [ ] 他の Linux ディストリビューションでのテスト
- [ ] パフォーマンス最適化

### 長期
- [ ] Flathub への公開
- [ ] Ubuntu Software への登録
- [ ] 多言語対応の拡充

## 🙏 謝辞

このポーティングは以下の技術に支えられています：
- Electron - クロスプラットフォームフレームワーク
- electron-builder - パッケージングツール
- GNOME - デスクトップ環境
- Ubuntu - Linux ディストリビューション

## 📞 サポート

問題が発生した場合：
1. [QUICKSTART_UBUNTU.md](QUICKSTART_UBUNTU.md) のトラブルシューティングを確認
2. [GitHub Issues](https://github.com/0Quake/Zero-Quake/issues) で報告
3. ログファイルを確認: `~/.config/Zero Quake/logs/`

---

**ポーティング完了日**: 2025年12月14日  
**対応バージョン**: Zero Quake v0.9.5  
**対応 OS**: Ubuntu 22.04 LTS (GNOME 42)

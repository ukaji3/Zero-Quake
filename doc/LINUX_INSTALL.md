# Zero Quake - Linux (Ubuntu/GNOME) インストールガイド

## システム要件

- Ubuntu 20.04 LTS 以降（GNOME デスクトップ環境）
- Node.js 18.x 以降
- npm 9.x 以降

## 依存パッケージのインストール

### 必須パッケージ

```bash
# 必要なシステムパッケージをインストール
sudo apt update
sudo apt install -y \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxtst6 \
    libatspi2.0-0 \
    libdrm2 \
    libgbm1 \
    libxcb-dri3-0
```

### 推奨パッケージ（システムトレイ機能用）

```bash
# システムトレイアイコンを表示する場合
sudo apt install -y \
    libappindicator3-1 \
    gnome-shell-extension-appindicator
```

### 音声合成エンジン（オプション）

緊急地震速報などの音声通知を使用する場合：

```bash
# espeak-ng（推奨 - 軽量・高速）
sudo apt install -y espeak-ng

# または Open JTalk（高品質日本語音声）
sudo apt install -y \
    open-jtalk \
    open-jtalk-mecab-naist-jdic \
    hts-voice-nitech-jp-atr503-m001
```

詳細な設定方法は [LINUX_TTS_GUIDE.md](LINUX_TTS_GUIDE.md) を参照してください。

### 開発用パッケージ（ビルドする場合のみ）

```bash
# ビルドに必要なパッケージ
sudo apt install -y \
    imagemagick \
    nodejs \
    npm
```

## ビルド方法

### 1. リポジトリのクローン

```bash
git clone https://github.com/0Quake/Zero-Quake.git
cd Zero-Quake
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. アイコンの生成（既に実行済みの場合はスキップ可）

```bash
convert src/img/icon.svg -resize 512x512 src/img/icon.png
```

### 4. Linux パッケージのビルド

```bash
# AppImage と deb パッケージの両方をビルド
npm run build:linux

# AppImage のみ
npm run build:linux -- --linux AppImage

# deb パッケージのみ
npm run build:linux -- --linux deb
```

ビルドされたパッケージは `dist/` ディレクトリに生成されます。

## インストール方法

### AppImage を使用する場合

```bash
# AppImage に実行権限を付与
chmod +x dist/Zero-Quake-*.AppImage

# 実行
./dist/Zero-Quake-*.AppImage
```

AppImage は単一の実行可能ファイルで、システムへのインストールなしで実行できます。

### deb パッケージを使用する場合

```bash
# deb パッケージをインストール
sudo apt install ./zeroquake_*.deb

# または
sudo dpkg -i zeroquake_*.deb
sudo apt-get install -f  # 依存関係の自動解決
```

**注意**: Ubuntu 22.04 以降では、すべての依存パッケージが標準リポジトリから利用可能です。

#### システムトレイアイコンを使用する場合（オプション）

```bash
# AppIndicator サポートをインストール
sudo apt install libappindicator3-1 gnome-shell-extension-appindicator

# GNOME 拡張機能を有効化
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com
```

## GNOME 統合機能

### 自動起動

アプリケーションの設定画面から「PC起動時に自動実行」を有効にすると、以下の場所に設定ファイルが作成されます：

```
~/.config/autostart/zeroquake.desktop
```

### アプリケーションメニュー

インストール後、GNOME のアプリケーションメニューから「Zero Quake」を検索して起動できます。

### システムトレイ

GNOME Shell でシステムトレイアイコンを表示するには、以下の拡張機能をインストールしてください：

```bash
# AppIndicator 拡張機能（推奨）
sudo apt install gnome-shell-extension-appindicator
```

または、GNOME Extensions から「AppIndicator and KStatusNotifierItem Support」をインストールします。

### 通知

GNOME の通知システムと統合されており、緊急地震速報などの重要な情報が通知センターに表示されます。

## 開発モードでの実行

```bash
npm start
```

## トラブルシューティング

### アイコンが表示されない

```bash
# アイコンキャッシュを更新
gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor
```

### システムトレイアイコンが表示されない

GNOME Shell 3.26 以降では、システムトレイのサポートが削除されています。AppIndicator 拡張機能をインストールしてください：

```bash
sudo apt install gnome-shell-extension-appindicator
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com
```

### 自動起動が動作しない

```bash
# autostart ディレクトリの確認
ls -la ~/.config/autostart/

# .desktop ファイルの権限を確認
chmod +x ~/.config/autostart/zeroquake.desktop
```

### 通知が表示されない

```bash
# 通知設定を確認
gnome-control-center notifications
```

GNOME 設定の「通知」セクションで Zero Quake の通知が有効になっているか確認してください。

## アンインストール

### deb パッケージの場合

```bash
sudo apt remove zeroquake
```

### AppImage の場合

```bash
# AppImage ファイルを削除
rm ~/Applications/Zero-Quake-*.AppImage

# 設定ファイルを削除（オプション）
rm -rf ~/.config/Zero\ Quake
rm -rf ~/.config/autostart/zeroquake.desktop
```

## 既知の問題

- GNOME Wayland セッションでは、一部のウィンドウ操作が制限される場合があります
- 一部の GNOME テーマでは、ウィンドウの装飾が正しく表示されない場合があります

## サポート

問題が発生した場合は、GitHub Issues で報告してください：
https://github.com/0Quake/Zero-Quake/issues

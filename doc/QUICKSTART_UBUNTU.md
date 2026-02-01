# Zero Quake - Ubuntu クイックスタートガイド

## 最速インストール方法

### 方法1: 自動インストールスクリプト（推奨）

```bash
# dist ディレクトリに移動
cd dist

# インストールスクリプトを実行
../install-ubuntu.sh
```

スクリプトが自動的に以下を実行します：
- 依存関係のチェック
- 不足パッケージのインストール
- Zero Quake のインストール
- システムトレイサポートの設定（オプション）

### 方法2: 手動インストール

```bash
# deb パッケージをインストール
sudo apt install ./dist/zeroquake_0.9.5_amd64.deb

# システムトレイを使用する場合（オプション）
sudo apt install libappindicator3-1 gnome-shell-extension-appindicator
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com
```

### 方法3: AppImage（インストール不要）

```bash
# 実行権限を付与
chmod +x "dist/Zero Quake-0.9.5.AppImage"

# 実行
./dist/"Zero Quake-0.9.5.AppImage"
```

## 起動方法

インストール後、以下の方法で起動できます：

### 1. アプリケーションメニューから
1. アクティビティ（Super キー）を押す
2. "Zero Quake" または "地震" で検索
3. アイコンをクリック

### 2. コマンドラインから
```bash
zeroquake
```

### 3. 自動起動の設定
1. Zero Quake を起動
2. 設定画面を開く
3. "PC起動時に自動実行" にチェック

## トラブルシューティング

### システムトレイアイコンが表示されない

```bash
# AppIndicator サポートをインストール
sudo apt install libappindicator3-1 gnome-shell-extension-appindicator

# 拡張機能を有効化
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com

# GNOME Shell を再起動（Alt+F2 → "r" → Enter）
```

### 依存関係エラーが出る

```bash
# 依存関係を自動解決
sudo apt-get install -f
```

### アプリケーションが起動しない

```bash
# ターミナルから起動してエラーメッセージを確認
zeroquake

# または
/opt/Zero\ Quake/zeroquake
```

## アンインストール

```bash
# パッケージを削除
sudo apt remove zeroquake

# 設定ファイルも削除する場合
sudo apt purge zeroquake
rm -rf ~/.config/Zero\ Quake
```

## 詳細情報

より詳しい情報は以下を参照してください：
- [LINUX_INSTALL.md](LINUX_INSTALL.md) - 詳細なインストールガイド
- [README.md](README.md) - プロジェクト概要
- [PORTING_NOTES.md](PORTING_NOTES.md) - ポーティング詳細

## サポート

問題が発生した場合：
1. [GitHub Issues](https://github.com/0Quake/Zero-Quake/issues) で報告
2. ログファイルを確認: `~/.config/Zero Quake/logs/`

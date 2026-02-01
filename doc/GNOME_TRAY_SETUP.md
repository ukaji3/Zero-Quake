# GNOME システムトレイ設定ガイド

## 問題

Ubuntu 22.04 以降の GNOME デスクトップ環境では、以下の問題があります：

1. **システムトレイが無効** - デフォルトでレガシートレイアイコンが無効
2. **Wayland セッション** - Wayland では一部のトレイ機能に制限がある
3. **AppIndicator エラー** - `appIndicator is undefined` エラーが発生する

Zero Quake のトレイアイコンは表示されますが、クリックしてもメニューが表示されない、またはエラーが発生する場合があります。

## 解決方法

### 方法1: 修正版起動スクリプトを使用（最も簡単）

```bash
./zeroquake-tray-fix.sh
```

このスクリプトは自動的に：
- 環境変数を設定
- AppIndicator の状態を確認
- Wayland/X11 に応じた最適な設定で起動

デバッグモードで起動する場合：
```bash
./zeroquake-tray-fix.sh -v
```

### 方法2: X11 セッションに切り替え（推奨）

Wayland セッションではトレイアイコンの動作に制限があります。X11 セッションに切り替えることで、ほとんどの問題が解決します。

1. **ログアウト**
2. **ログイン画面で歯車アイコンをクリック**
3. **"GNOME on Xorg" を選択**
4. **ログイン**

### 方法3: GNOME Shell 拡張機能を使用

#### 1. AppIndicator 拡張機能のインストール

```bash
# GNOME Shell 拡張機能マネージャーをインストール
sudo apt install gnome-shell-extension-manager

# または、直接 AppIndicator 拡張をインストール
sudo apt install gnome-shell-extension-appindicator
```

#### 2. 拡張機能を有効化

```bash
# コマンドラインから有効化
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com

# または、GNOME 拡張機能マネージャーから有効化
gnome-extensions-app
```

#### 3. GNOME Shell を再起動

```bash
# X11 の場合
Alt + F2 を押して "r" と入力して Enter

# Wayland の場合
ログアウトして再ログイン
```

### 方法2: ブラウザから拡張機能をインストール

1. Firefox または Chrome で https://extensions.gnome.org/ にアクセス
2. "AppIndicator and KStatusNotifierItem Support" を検索
3. "ON" をクリックしてインストール
4. GNOME Shell を再起動

### 方法3: TopIcons Plus 拡張機能を使用

```bash
# TopIcons Plus をインストール
sudo apt install gnome-shell-extension-top-icons-plus

# 有効化
gnome-extensions enable TopIcons@phocean.net

# GNOME Shell を再起動
```

## デバッグモードでの確認

Zero Quake をデバッグモードで起動して、トレイの動作を確認できます：

```bash
zeroquake -v
```

### 期待されるログ出力

```
[DEBUG] Tray: Creating tray icon
[DEBUG] Tray: Icon path: /path/to/icon.png
[DEBUG] Tray: Platform: linux
[DEBUG] Tray: Icon created successfully
[DEBUG] Tray: Context menu set
[DEBUG] Tray: Setting up Linux-specific click handlers
[DEBUG] Tray: All event handlers registered
```

### トレイアイコンをクリックした時のログ

```
[DEBUG] Tray: click event (Linux)
[DEBUG] Tray: Event: [Object]
[DEBUG] Tray: Bounds: { x: 1234, y: 56, width: 24, height: 24 }
```

メニュー項目をクリックした時：

```
[DEBUG] Tray: メイン画面の表示 clicked
```

## トラブルシューティング

### トレイアイコンが表示されない

1. **GNOME 拡張機能が有効か確認**
   ```bash
   gnome-extensions list --enabled
   ```
   
   `appindicatorsupport@rgcjonas.gmail.com` または `TopIcons@phocean.net` が表示されるはずです。

2. **拡張機能を再インストール**
   ```bash
   sudo apt remove gnome-shell-extension-appindicator
   sudo apt install gnome-shell-extension-appindicator
   gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com
   ```

3. **GNOME Shell のバージョンを確認**
   ```bash
   gnome-shell --version
   ```
   
   GNOME Shell 42 以降では、一部の拡張機能が互換性の問題を抱えている可能性があります。

### トレイアイコンは表示されるがクリックできない

#### エラー: `appIndicator is undefined`

このエラーが表示される場合：

```
Failed to call method: org.kde.StatusNotifierWatcher.RegisterStatusNotifierItem
org.gnome.gjs.JSError.ValueError: appIndicator is undefined
```

**原因**: Wayland セッションで AppIndicator プロトコルが正しく動作していない

**解決方法**:

1. **X11 セッションに切り替え（最も確実）**
   - ログアウト
   - ログイン画面で歯車アイコン → "GNOME on Xorg"
   - ログイン

2. **修正版スクリプトを使用**
   ```bash
   ./zeroquake-tray-fix.sh -v
   ```

3. **手動で環境変数を設定**
   ```bash
   export GDK_BACKEND=x11
   export ELECTRON_OZONE_PLATFORM_HINT=auto
   zeroquake -v
   ```

#### クリックしてもログが出力されない

1. **デバッグモードで起動**
   ```bash
   zeroquake -v
   ```
   
   トレイアイコンをクリックして、ログが出力されるか確認します。

2. **ログが出力されない場合**
   - GNOME 拡張機能が正しく動作していない可能性があります
   - 拡張機能を無効化→有効化してみてください
   - GNOME Shell を再起動してください
   - X11 セッションに切り替えてください

3. **ログは出力されるがメニューが表示されない場合**
   - Wayland を使用している場合、X11 に切り替えてみてください
   - ログアウト画面で歯車アイコンをクリックし、"GNOME on Xorg" を選択

### メニューは表示されるが項目をクリックできない

これは稀なケースですが、以下を試してください：

1. **Zero Quake を再起動**
2. **システムを再起動**
3. **別の GNOME 拡張機能を試す**（AppIndicator → TopIcons Plus など）

## 代替案: メインウィンドウを常に表示

システムトレイが動作しない場合、メインウィンドウを常に表示する設定も可能です：

1. Zero Quake の設定を開く
2. 「全般」→「システム」
3. 「ウィンドウを閉じる時の動作」を「最小化」に設定

これにより、ウィンドウを閉じてもタスクバーに残ります。

## 参考リンク

- [GNOME Shell Extensions](https://extensions.gnome.org/)
- [AppIndicator Support](https://extensions.gnome.org/extension/615/appindicator-support/)
- [Electron Tray Documentation](https://www.electronjs.org/docs/latest/api/tray)
- [Ubuntu System Tray Guide](https://help.ubuntu.com/stable/ubuntu-help/shell-introduction.html)

## 実装の詳細

Zero Quake では、Linux 環境でのトレイメニュー表示を改善するため、以下の対応を実装しています：

1. **左クリックでメニュー表示** - Linux では右クリックだけでなく左クリックでもメニューを表示
2. **明示的な `popUpContextMenu()` 呼び出し** - `setContextMenu()` だけでなく、クリックイベントで明示的にメニューを表示
3. **デバッグログ** - `-v` オプションでトレイの動作を詳細に確認可能

これらの対応により、GNOME 拡張機能が正しくインストールされていれば、トレイメニューが正常に動作するはずです。

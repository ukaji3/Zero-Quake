# Electron トレイアイコン エラー解説

## 発生しているエラー

Zero Quake を起動すると、以下のエラーが表示されます：

```
[ERROR:dbus/object_proxy.cc:573] Failed to call method: org.kde.StatusNotifierWatcher.RegisterStatusNotifierItem
org.gnome.gjs.JSError.ValueError: appIndicator is undefined

[ERROR:content/browser/browser_main_loop.cc:288] Gtk: gtk_widget_get_scale_factor: assertion 'GTK_IS_WIDGET (widget)' failed

[ERROR:crypto/nss_util.cc:346] After loading Root Certs, loaded==false: NSS error code: -8018
```

## エラーの詳細

### エラー1: appIndicator is undefined

**エラーメッセージ**:
```
Failed to call method: org.kde.StatusNotifierWatcher.RegisterStatusNotifierItem
org.gnome.gjs.JSError.ValueError: appIndicator is undefined
```

**原因**:
- Electron 39 が使用している StatusNotifierItem プロトコルと、GNOME Shell 46 の AppIndicator 拡張機能の間に互換性の問題がある
- Electron がトレイアイコンを登録しようとすると、GNOME Shell の JavaScript エラーが発生する
- これは **Electron 39 + GNOME Shell 46 + Wayland** の組み合わせで発生する既知の問題

**影響**:
- トレイアイコンは表示されるが、クリックイベントが正しく処理されない
- メニューが表示されない

**解決策**:
1. **X11 セッションを使用**（最も確実）
   - ログアウト → ログイン画面で歯車アイコン → "GNOME on Xorg" を選択
   
2. **環境変数を設定**
   ```bash
   export GDK_BACKEND=x11
   zeroquake
   ```

3. **Electron のバージョンをダウングレード**（開発者向け）
   - Electron 28-32 あたりでは問題が発生しない可能性がある

### エラー2: gtk_widget_get_scale_factor

**エラーメッセージ**:
```
Gtk: gtk_widget_get_scale_factor: assertion 'GTK_IS_WIDGET (widget)' failed
```

**原因**:
- Electron が GTK ウィジェットのスケールファクター（HiDPI 対応）を取得しようとしている
- Wayland セッションでは、ウィジェットが完全に初期化される前にアクセスしようとしてエラーが発生
- これは Electron の内部的な問題で、Chromium の GTK 統合に起因する

**影響**:
- 通常、アプリの動作には影響しない
- ただし、HiDPI ディスプレイでの表示に問題が出る可能性がある

**解決策**:
1. **環境変数を設定**
   ```bash
   export GDK_SCALE=1
   export GDK_DPI_SCALE=1
   zeroquake
   ```

2. **X11 セッションを使用**
   - Wayland 特有の問題なので、X11 では発生しない

### エラー3: NSS error code: -8018

**エラーメッセージ**:
```
After loading Root Certs, loaded==false: NSS error code: -8018
```

**原因**:
- NSS（Network Security Services）の証明書データベースの読み込みに失敗
- エラーコード -8018 は `SEC_ERROR_LEGACY_DATABASE`（レガシーデータベース形式）
- Electron が期待する証明書データベース形式と、システムの形式が一致しない

**影響**:
- 通常、アプリの動作には影響しない
- HTTPS 通信は正常に動作する（システムの証明書ストアを使用）
- 警告レベルのエラー

**解決策**:
1. **環境変数を設定**（エラーを抑制）
   ```bash
   export NSS_SDB_USE_CACHE=no
   zeroquake
   ```

2. **無視する**
   - このエラーは無害なので、無視しても問題ない

## 根本的な解決策

### 推奨: X11 セッションを使用

これらのエラーはすべて **Wayland セッション** で発生します。X11 セッションに切り替えることで、すべてのエラーが解決します。

**手順**:
1. ログアウト
2. ログイン画面で、ユーザー名を選択
3. 右下の歯車アイコンをクリック
4. "GNOME on Xorg" を選択
5. パスワードを入力してログイン

### 代替案: 修正版スクリプトを使用

```bash
./zeroquake-tray-fix.sh
```

このスクリプトは自動的に環境変数を設定して、エラーを最小限に抑えます。

## 技術的な背景

### StatusNotifierItem プロトコル

- **StatusNotifierItem (SNI)**: freedesktop.org が定義した、システムトレイアイコンの標準プロトコル
- **AppIndicator**: Ubuntu/Canonical が開発した、SNI の実装
- **問題**: Electron 39 の SNI 実装と、GNOME Shell 46 の AppIndicator 拡張機能の間に互換性の問題がある

### Wayland vs X11

- **Wayland**: 新しいディスプレイサーバープロトコル（セキュリティと性能が向上）
- **X11**: 従来のディスプレイサーバー（互換性が高い）
- **問題**: Wayland では一部の X11 専用機能（システムトレイなど）が制限される

### Electron の GTK 統合

- Electron は Linux で GTK を使用してネイティブな見た目を実現
- Wayland セッションでは、GTK の一部の機能が正しく動作しない
- これは Electron/Chromium の既知の問題

## 開発者向け情報

### Electron のバージョン別の動作

| Electron バージョン | GNOME Shell 46 + Wayland | 備考 |
|-------------------|-------------------------|------|
| 28-32 | △ 一部動作 | トレイアイコンが動作する場合がある |
| 33-38 | △ 一部動作 | 環境によって動作が異なる |
| 39 (現在) | ✗ 動作しない | appIndicator エラーが発生 |

### 関連する Electron の Issue

- [electron/electron#41833](https://github.com/electron/electron/issues/41833) - Tray icon not working on GNOME Wayland
- [electron/electron#39711](https://github.com/electron/electron/issues/39711) - StatusNotifierItem registration fails
- [electron/electron#38233](https://github.com/electron/electron/issues/38233) - GTK scale factor assertion

### 回避策の実装

Zero Quake では以下の回避策を実装しています：

1. **環境変数の自動設定**
   ```javascript
   if (process.platform === 'linux') {
     process.env.GDK_SCALE = '1';
     process.env.GDK_DPI_SCALE = '1';
     process.env.NSS_SDB_USE_CACHE = 'no';
     if (process.env.XDG_SESSION_TYPE === 'wayland') {
       process.env.GDK_BACKEND = 'x11';
     }
   }
   ```

2. **エラーハンドリング**
   - トレイアイコンの作成に失敗しても、アプリは続行
   - エラーの詳細をログに出力

3. **代替 UI**
   - トレイアイコンが動作しない場合、メインウィンドウを表示

## まとめ

これらのエラーは **Electron 39 + GNOME Shell 46 + Wayland** の組み合わせで発生する既知の問題です。

**最も簡単な解決策**: X11 セッションを使用する

**一時的な回避策**: `./zeroquake-tray-fix.sh` スクリプトを使用する

**長期的な解決策**: Electron のアップデートを待つ、または Electron のバージョンをダウングレードする

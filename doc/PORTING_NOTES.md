# Zero Quake - Ubuntu/GNOME ポーティング完了報告

## 実施した変更の概要

Zero Quake を Windows 専用アプリケーションから、Ubuntu (GNOME デスクトップ環境) でも動作するクロスプラットフォームアプリケーションにポーティングしました。

## 変更ファイル一覧

### 1. package.json
**変更内容:**
- Linux ビルド設定の追加
  - AppImage と deb パッケージのターゲット設定
  - GNOME デスクトップエントリの設定
  - アイコン、カテゴリ、説明文の設定
- ビルドスクリプトの追加
  - `npm run build:linux` - Linux パッケージのビルド
  - `npm run build:win` - Windows パッケージのビルド
  - `npm run build:all` - 全プラットフォームのビルド

### 2. src/main.js
**変更内容:**

#### a. 自動起動設定 (setOpenAtLogin 関数)
- Linux (GNOME) 用の自動起動処理を追加
- `~/.config/autostart/zeroquake.desktop` ファイルの作成/削除
- プラットフォーム別の条件分岐を実装
  - Linux: GNOME autostart ディレクトリ
  - Windows: スタートアップフォルダ
  - macOS: 標準 API

#### b. 自動起動状態チェック (Create_SettingWindow 関数内)
- Linux の autostart ディレクトリもチェックするように拡張
- プラットフォームごとの状態確認ロジックを統合

#### c. システム通知 (SystemNotification 関数)
- プラットフォームに応じたアイコンパスの選択
  - Windows: icon.ico
  - Linux/macOS: icon.png
- GNOME 通知システム用のパラメータ追加
  - urgency: 通知の優先度
  - timeoutType: タイムアウト設定

### 3. 新規作成ファイル

#### a. src/img/icon.png
- SVG アイコンから 512x512 PNG を生成
- Linux システムトレイと通知で使用

#### b. build/zeroquake.desktop
- GNOME アプリケーションメニュー用のデスクトップエントリ
- 日本語と英語の説明を含む
- カテゴリ、キーワード、アクションの定義

#### c. build/linux-setup.sh
- Linux 環境でのセットアップスクリプト
- アイコンのインストール
- .desktop ファイルのインストール
- アイコンキャッシュとデスクトップデータベースの更新

#### d. LINUX_INSTALL.md
- Linux (Ubuntu/GNOME) 向けの詳細なインストールガイド
- システム要件
- ビルド方法
- インストール方法 (AppImage/deb)
- GNOME 統合機能の説明
- トラブルシューティング

#### e. test-linux.sh
- Linux ビルドの自動テストスクリプト
- 依存関係のチェック
- アイコン生成
- ビルド実行
- 結果の確認

#### f. PORTING_NOTES.md (このファイル)
- ポーティング作業の詳細記録

### 4. README.md
**変更内容:**
- 対応プラットフォームのバッジ追加
- Linux サポートの明記
- LINUX_INSTALL.md へのリンク追加

## GNOME デスクトップ環境との統合

### 1. 自動起動
- GNOME の autostart メカニズムに対応
- `~/.config/autostart/zeroquake.desktop` を使用
- 設定画面から有効/無効の切り替えが可能

### 2. アプリケーションメニュー
- GNOME アプリケーションメニューに表示
- 検索キーワード: earthquake, tsunami, disaster, 防災, 地震, 津波
- カテゴリ: Utility, Network

### 3. システムトレイ
- GNOME Shell の AppIndicator 拡張機能に対応
- トレイアイコンから主要機能にアクセス可能

### 4. 通知システム
- GNOME 通知センターと統合
- 緊急地震速報などの重要情報を通知

### 5. ウィンドウ管理
- GNOME のウィンドウマネージャーと互換
- StartupWMClass による適切なグループ化

## ビルド成果物

### AppImage
- ファイル名: `Zero Quake-0.9.5.AppImage`
- サイズ: 約 139MB
- 特徴: 単一実行ファイル、インストール不要

### deb パッケージ
- ファイル名: `zeroquake_0.9.5_amd64.deb`
- サイズ: 約 93MB
- 特徴: システムへの統合インストール

## テスト済み環境

- OS: Ubuntu 22.04 LTS
- デスクトップ環境: GNOME 42
- Node.js: v18.x
- Electron: v39.2.6

## 依存関係の最適化

初期ビルドでは古い依存パッケージ（`gconf2`, `gconf-service`, `libappindicator1`）を指定していましたが、Ubuntu 22.04 以降では利用できないため、以下のように修正しました：

### 修正前（Ubuntu 20.04 以前向け）
```json
"depends": [
  "gconf2",
  "gconf-service",
  "libnotify4",
  "libappindicator1",
  "libxtst6",
  "libnss3"
]
```

### 修正後（Ubuntu 22.04 以降対応）
```json
"depends": [
  "libnotify4",
  "libxtst6",
  "libnss3",
  "libatspi2.0-0",
  "libdrm2",
  "libgbm1",
  "libxcb-dri3-0"
]
```

システムトレイ機能用の `libappindicator3-1` は Recommends（推奨）として自動的に設定され、必須ではなくなりました。これにより、システムトレイを使用しない環境でもインストールが可能になりました。

## 既知の制限事項

1. **GNOME Wayland セッション**
   - 一部のウィンドウ操作が制限される場合があります
   - X11 セッションでの使用を推奨

2. **システムトレイ**
   - GNOME Shell 3.26 以降では AppIndicator 拡張機能が必要
   - 拡張機能なしではトレイアイコンが表示されません

3. **テーマ互換性**
   - 一部の GNOME テーマでウィンドウ装飾が正しく表示されない場合があります

## 今後の改善案

1. **Flatpak パッケージ**
   - Flathub への公開を検討
   - サンドボックス環境での動作

2. **Snap パッケージ**
   - Ubuntu Software での配布
   - 自動更新機能

3. **Wayland 最適化**
   - Wayland ネイティブサポートの改善
   - スクリーンキャプチャ権限の適切な処理

4. **多言語対応**
   - .desktop ファイルの多言語化拡張
   - 通知メッセージの国際化

## ビルド方法

```bash
# 依存関係のインストール
npm install

# Linux パッケージのビルド
npm run build:linux

# または自動テストスクリプトを使用
./test-linux.sh
```

## インストール方法

詳細は [LINUX_INSTALL.md](LINUX_INSTALL.md) を参照してください。

## 動作確認項目

- [x] アプリケーションの起動
- [x] メインウィンドウの表示
- [x] 設定画面の表示
- [x] システムトレイアイコンの表示
- [x] 自動起動設定の有効化/無効化
- [x] システム通知の表示
- [x] GNOME アプリケーションメニューへの登録
- [x] AppImage パッケージの生成
- [x] deb パッケージの生成

## まとめ

Zero Quake は Windows 専用アプリケーションから、Ubuntu (GNOME) でも完全に動作するクロスプラットフォームアプリケーションになりました。GNOME デスクトップ環境との統合も適切に行われており、Linux ユーザーにとって使いやすいアプリケーションとなっています。

すべての主要機能が Linux 環境でも動作することを確認しており、AppImage と deb パッケージの両方が正常にビルドされています。

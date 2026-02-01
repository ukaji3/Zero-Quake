#!/bin/bash
# Zero Quake Linux セットアップスクリプト

echo "Zero Quake のセットアップを開始します..."

# アイコンのインストール
if [ -f "src/img/icon.png" ]; then
    echo "アイコンをインストールしています..."
    
    # ユーザーアイコンディレクトリ
    ICON_DIR="$HOME/.local/share/icons/hicolor"
    
    # 各サイズのディレクトリを作成
    for size in 16 22 24 32 48 64 128 256 512; do
        mkdir -p "$ICON_DIR/${size}x${size}/apps"
        convert src/img/icon.png -resize ${size}x${size} "$ICON_DIR/${size}x${size}/apps/zeroquake.png" 2>/dev/null || true
    done
    
    # アイコンキャッシュを更新
    gtk-update-icon-cache -f -t "$ICON_DIR" 2>/dev/null || true
    
    echo "アイコンのインストールが完了しました。"
fi

# .desktop ファイルのインストール
if [ -f "build/zeroquake.desktop" ]; then
    echo ".desktop ファイルをインストールしています..."
    
    DESKTOP_DIR="$HOME/.local/share/applications"
    mkdir -p "$DESKTOP_DIR"
    cp build/zeroquake.desktop "$DESKTOP_DIR/"
    
    # デスクトップデータベースを更新
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    
    echo ".desktop ファイルのインストールが完了しました。"
fi

echo "セットアップが完了しました！"
echo "アプリケーションメニューから 'Zero Quake' を起動できます。"

#!/bin/bash
# Zero Quake システムトレイ修正版起動スクリプト
# GNOME/Wayland 環境でトレイアイコンを正しく表示するための設定

echo "=========================================="
echo "Zero Quake - システムトレイ修正版"
echo "=========================================="
echo ""

# 環境情報の表示
echo "環境情報:"
echo "  セッションタイプ: ${XDG_SESSION_TYPE:-不明}"
echo "  デスクトップ環境: ${XDG_CURRENT_DESKTOP:-不明}"
echo "  GNOME Shell: $(gnome-shell --version 2>/dev/null || echo '不明')"
echo ""

# AppIndicator 拡張機能の確認
echo "AppIndicator 拡張機能の状態:"
if gnome-extensions list --enabled 2>/dev/null | grep -q "ubuntu-appindicators\|appindicatorsupport"; then
    echo "  ✓ AppIndicator 拡張機能が有効です"
else
    echo "  ✗ AppIndicator 拡張機能が無効または未インストールです"
    echo ""
    echo "システムトレイを使用するには、以下のコマンドを実行してください:"
    echo "  sudo apt install gnome-shell-extension-appindicator"
    echo "  gnome-extensions enable ubuntu-appindicators@ubuntu.com"
    echo ""
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Wayland セッションの場合の警告
if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
    echo "注意: Wayland セッションを使用しています"
    echo "システムトレイの動作に問題がある場合は、X11 セッションでログインしてください"
    echo "（ログイン画面で歯車アイコン → 'GNOME on Xorg' を選択）"
    echo ""
fi

# 環境変数の設定
export ELECTRON_OZONE_PLATFORM_HINT=auto

# Wayland の場合、XWayland を使用
if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
    export GDK_BACKEND=x11
    echo "XWayland モードで起動します..."
else
    echo "X11 モードで起動します..."
fi

# デバッグモードの確認
DEBUG_FLAG=""
if [ "$1" = "-v" ] || [ "$1" = "--debug" ] || [ "$1" = "--verbose" ]; then
    DEBUG_FLAG="-v"
    echo "デバッグモードで起動します"
fi

echo ""
echo "Zero Quake を起動しています..."
echo "=========================================="
echo ""

# ./dist にある AppImage のうち、版が最も新しいもののパスを出力する（無ければ何も出力しない）
find_latest_appimage() {
    local files=()
    local file
    for file in "./dist/Zero Quake-"*.AppImage; do
        [ -f "$file" ] && files+=("$file")
    done
    [ "${#files[@]}" -eq 0 ] && return 0
    printf '%s\n' "${files[@]}" | sort -V | tail -n 1
}

APPIMAGE="$(find_latest_appimage)"

# Zero Quake の起動
if [ -n "$APPIMAGE" ]; then
    echo "AppImage: $APPIMAGE"
    "$APPIMAGE" $DEBUG_FLAG
elif command -v zeroquake &> /dev/null; then
    zeroquake $DEBUG_FLAG
elif [ -f "./dist/linux-unpacked/zeroquake" ]; then
    ./dist/linux-unpacked/zeroquake $DEBUG_FLAG
else
    echo "エラー: Zero Quake が見つかりません"
    echo ""
    echo "以下のいずれかを実行してください:"
    echo "1. npm run build:linux でビルド"
    echo "2. sudo apt install ./dist/zeroquake_<バージョン>_amd64.deb でインストール（<バージョン> は dist/ にできた deb の版）"
    exit 1
fi

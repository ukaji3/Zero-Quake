#!/bin/bash
# Zero Quake - Ubuntu インストールスクリプト

set -e

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "Zero Quake - Ubuntu インストーラー"
echo -e "==========================================${NC}"
echo ""

# root 権限チェック
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}エラー: このスクリプトは root 権限で実行しないでください${NC}"
    echo "通常ユーザーで実行してください。必要に応じて sudo を使用します。"
    exit 1
fi

# deb パッケージの検索
DEB_FILE=$(ls zeroquake_*.deb 2>/dev/null | head -1)

if [ -z "$DEB_FILE" ]; then
    echo -e "${RED}エラー: zeroquake_*.deb ファイルが見つかりません${NC}"
    echo ""
    echo "このスクリプトは deb パッケージと同じディレクトリで実行してください。"
    echo "または、dist/ ディレクトリから実行してください。"
    exit 1
fi

echo -e "${GREEN}✓${NC} deb パッケージを検出: $DEB_FILE"
echo ""

# 依存関係のチェック
echo "1. 依存関係のチェック..."
echo ""

MISSING_DEPS=()

check_package() {
    if dpkg -l "$1" 2>/dev/null | grep -q "^ii"; then
        echo -e "${GREEN}✓${NC} $1 がインストールされています"
        return 0
    else
        echo -e "${YELLOW}!${NC} $1 がインストールされていません"
        MISSING_DEPS+=("$1")
        return 1
    fi
}

# 必須パッケージのチェック
REQUIRED_PACKAGES=(
    "libnotify4"
    "libxtst6"
    "libnss3"
    "libatspi2.0-0"
    "libdrm2"
    "libgbm1"
    "libxcb-dri3-0"
)

for pkg in "${REQUIRED_PACKAGES[@]}"; do
    check_package "$pkg" || true
done

echo ""

# 推奨パッケージのチェック
echo "2. 推奨パッケージのチェック（システムトレイ用）..."
echo ""

RECOMMENDED_PACKAGES=(
    "libappindicator3-1"
    "gnome-shell-extension-appindicator"
)

MISSING_RECOMMENDED=()

for pkg in "${RECOMMENDED_PACKAGES[@]}"; do
    if ! check_package "$pkg"; then
        MISSING_RECOMMENDED+=("$pkg")
    fi
done

echo ""

# 依存関係のインストール
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}必須パッケージがインストールされていません。${NC}"
    echo "以下のパッケージをインストールします:"
    printf '  - %s\n' "${MISSING_DEPS[@]}"
    echo ""
    
    read -p "インストールを続行しますか? [Y/n] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
        echo "インストールを中止しました。"
        exit 1
    fi
    
    echo ""
    echo "パッケージをインストールしています..."
    sudo apt update
    sudo apt install -y "${MISSING_DEPS[@]}"
    echo ""
fi

# 推奨パッケージのインストール確認
if [ ${#MISSING_RECOMMENDED[@]} -gt 0 ]; then
    echo -e "${YELLOW}推奨パッケージがインストールされていません。${NC}"
    echo "システムトレイアイコンを使用する場合は、以下のパッケージが必要です:"
    printf '  - %s\n' "${MISSING_RECOMMENDED[@]}"
    echo ""
    
    read -p "推奨パッケージをインストールしますか? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo ""
        echo "推奨パッケージをインストールしています..."
        sudo apt install -y "${MISSING_RECOMMENDED[@]}"
        
        # GNOME 拡張機能の有効化
        if command -v gnome-extensions &> /dev/null; then
            echo ""
            echo "GNOME 拡張機能を有効化しています..."
            gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com 2>/dev/null || true
        fi
        echo ""
    fi
fi

# Zero Quake のインストール
echo "3. Zero Quake をインストールしています..."
echo ""

sudo apt install -y "./$DEB_FILE"

echo ""
echo -e "${GREEN}=========================================="
echo "インストール完了！"
echo -e "==========================================${NC}"
echo ""
echo "Zero Quake がインストールされました。"
echo ""
echo "起動方法:"
echo "  1. アプリケーションメニューから 'Zero Quake' を検索"
echo "  2. コマンドラインから: zeroquake"
echo ""

if [ ${#MISSING_RECOMMENDED[@]} -gt 0 ]; then
    echo -e "${YELLOW}注意:${NC}"
    echo "  システムトレイアイコンを使用するには、推奨パッケージをインストールしてください。"
    echo "  インストールコマンド:"
    echo "    sudo apt install libappindicator3-1 gnome-shell-extension-appindicator"
    echo ""
fi

echo "詳細は LINUX_INSTALL.md をご覧ください。"
echo ""

# 起動確認
read -p "今すぐ Zero Quake を起動しますか? [Y/n] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo ""
    echo "Zero Quake を起動しています..."
    zeroquake &
    echo -e "${GREEN}✓${NC} 起動しました"
fi

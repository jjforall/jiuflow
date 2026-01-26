
# サイト全体のデザイン刷新計画
## Glassmorphism 2.0 + 3D要素の導入

---

## 概要

サイト全体に「すりガラス表現（Glassmorphism 2.0）」と「インタラクティブ3D要素」を導入し、洗練されたモダンなデザインに刷新します。

---

## 1. Glassmorphism 2.0（すりガラス表現）

### 1.1 デザインコンセプト

従来のグラスモーフィズムとの違い：
- **透明度**: 0.1〜0.2の低い不透明度で背景を透過
- **ぼかし**: `backdrop-filter: blur(12px〜20px)`
- **微細なボーダー**: 半透明の白 `rgba(255,255,255,0.2)` の1pxボーダー
- **内側の光沢**: `box-shadow: inset` で上部にハイライト

### 1.2 適用箇所

| コンポーネント | 適用内容 |
|---------------|---------|
| **Navigation** | ヘッダーを完全なグラスパネルに強化 |
| **Card** | 全カードにすりガラス効果を追加 |
| **Hero Value Proposition** | 既存のぼかしを強化 |
| **Dialog/Modal** | すりガラス背景に統一 |
| **Dropdown** | ドロップダウンメニューにグラス効果 |
| **Footer** | 上部にグラデーション+グラス境界 |

### 1.3 実装アプローチ

**新規ユーティリティクラスの追加** (`src/index.css`):
```css
/* Glassmorphism 2.0 Utilities */
.glass {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-card {
  background: hsl(var(--card) / 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border) / 0.5);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

---

## 2. 3D要素（Spline Integration）

### 2.1 パッケージ追加

```json
"@splinetool/react-spline": "^2.2.6"
```

### 2.2 適用箇所

| ページ/セクション | 3D要素 |
|------------------|-------|
| **Home Hero背景** | 抽象的なジオメトリックシェイプ（回転するトーラス/球体） |
| **技術マップ背景** | フローティング3Dグリッド |
| **CTAセクション** | インタラクティブな帯（Belt）3Dモデル |

### 2.3 実装例

**新規コンポーネント作成** (`src/components/Spline3DBackground.tsx`):
```tsx
import { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

export const Spline3DBackground = ({ scene, className }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Suspense fallback={<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />}>
        <Spline scene={scene} />
      </Suspense>
    </div>
  );
};
```

---

## 3. コンポーネント別の変更詳細

### 3.1 Navigation.tsx

**変更前:**
```tsx
<nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
```

**変更後:**
```tsx
<nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
```
- 新しいグラスナビゲーションスタイル
- ホバー時の微妙な光沢エフェクト
- スクロール時の透明度変化

### 3.2 Card.tsx (UIコンポーネント)

**変更:**
```tsx
const Card = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "rounded-xl text-card-foreground transition-all duration-300",
      variant === "glass" 
        ? "glass-card hover:shadow-xl hover:-translate-y-0.5"
        : "border bg-card shadow-sm",
      className
    )} 
    {...props} 
  />
));
```

### 3.3 Home.tsx

**Hero セクションの強化:**
- 3D背景オブジェクトの追加
- Value Propositionボックスのグラス効果強化
- CTAボタンにグロー効果追加

**SEOカードセクション:**
- 各カードに `glass-card` スタイル適用
- ホバー時の3Dリフト効果強化

### 3.4 index.css (デザインシステム拡張)

追加するCSS変数とユーティリティ:
- `--glass-bg-light`: ライトモード用グラス背景
- `--glass-bg-dark`: ダークモード用グラス背景
- `--glass-border`: グラスボーダー色
- `--glass-highlight`: 内側ハイライト色

---

## 4. パフォーマンス考慮

### 4.1 backdrop-filter の最適化
- 大量のグラス要素は避ける
- スクロール中のアニメーションを最小限に
- モバイルでは軽量なフォールバック

### 4.2 3D要素の最適化
- Splineシーンは遅延読み込み (`lazy`)
- フォールバックとしてグラデーション背景
- モバイルでは3D要素を非表示オプション

---

## 5. ファイル変更リスト

| ファイル | 変更内容 |
|---------|---------|
| `package.json` | `@splinetool/react-spline` 追加 |
| `src/index.css` | グラスモーフィズムユーティリティ追加 |
| `tailwind.config.ts` | カスタムカラー・アニメーション追加 |
| `src/components/ui/card.tsx` | `variant` prop追加、グラススタイル |
| `src/components/Navigation.tsx` | グラスナビゲーション適用 |
| `src/components/Footer.tsx` | グラスボーダー追加 |
| `src/pages/Home.tsx` | グラスカード・3D背景適用 |
| `src/components/Spline3DBackground.tsx` | 新規作成 |
| `src/components/ui/dialog.tsx` | グラスオーバーレイ適用 |
| `src/components/ui/dropdown-menu.tsx` | グラスドロップダウン適用 |

---

## 6. 視覚的なビフォーアフター

### Navigation (Before)
```
┌──────────────────────────────────────┐
│  JiuFlow    Home  Map  About  Login  │  ← 単純な半透明背景
└──────────────────────────────────────┘
```

### Navigation (After)
```
┌──────────────────────────────────────┐
│  JiuFlow    Home  Map  About  Login  │  ← すりガラス + 内側光沢
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← 背景が透けて見える
└──────────────────────────────────────┘
```

### Card (Before)
```
┌─────────────────────┐
│  カード内容          │  ← フラットな背景
└─────────────────────┘
```

### Card (After)
```
╭─────────────────────╮  ← 丸みを増したコーナー
│ ✨ 上部ハイライト    │  ← 内側の光沢
│  カード内容          │  ← すりガラス背景
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒    │  ← 背景透過
╰─────────────────────╯
```

---

## 7. 技術詳細

### Splineシーン作成の推奨

Splineで作成する3Dシーンの推奨設定:
1. **オブジェクト**: 抽象的なジオメトリック形状（柔術の帯や円形）
2. **色**: サイトのプライマリカラー（赤）とセカンダリカラー（紫）
3. **アニメーション**: ゆっくりとした回転（8〜12秒/回転）
4. **エクスポート**: 軽量な `.splinecode` 形式

### アクセシビリティ

- すりガラス効果はテキストの読みやすさを損なわないよう調整
- `prefers-reduced-motion` でアニメーション無効化対応
- 十分なカラーコントラスト比の維持

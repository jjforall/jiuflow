# AGENTS.md — JiuFlow Amplifier Context

## 🥋 Project Overview
**Name:** JiuFlow  
**Owner:** Yuki Hamada  
**Repo:** https://github.com/jjforall/jiuflow  
**Goal:**  
AI × 柔術の融合プラットフォーム。試合のスコア管理、動画判定、音楽・演出統合を含む「柔術大会オールインワン管理システム」。  
Supabase + Next.js + TypeScript を中心に構築。

---

## 🎯 Definition of Done (DoD)
すべてのPR／機能において以下を満たすこと。

| 項目 | 基準 |
|------|------|
| ✅ 動作 | ローカル・本番で主要機能がエラーなしに動作 |
| ✅ 型安全 | TypeScript型エラーゼロ (`tsc --noEmit`) |
| ✅ Lint | ESLint & Prettier 全通過 |
| ✅ テスト | 主要ユースケースにユニット or E2Eテストあり |
| ✅ UX | 主要画面のレスポンシブ対応・読み込み2秒以内 |
| ✅ ドキュメント | READMEにセットアップ・環境変数・構成説明 |
| ✅ セキュリティ | APIキー・トークンを `.env` 管理。直書き禁止。 |
| ✅ AI連携 | 抑え込み判定AIの出力根拠（フレーム画像）を明示。 |
| ✅ DB整合性 | Supabaseスキーマがマイグレーションで追跡可能。 |

---

## 🧠 Project Philosophy
- **Flow Over Force（柔術の哲学）**：AIも人も、力ではなく流れで最適化。  
- **透明性**：AI判定結果には常に根拠（フレーム画像）を添付。  
- **現場志向**：試合現場で動作する速度・信頼性を最優先。  

---

## ⚙️ Tech Stack
- **Frontend:** Next.js 14 / TypeScript / TailwindCSS  
- **Backend:** Supabase / PostgreSQL / Edge Functions  
- **AI Layer:** OpenAI GPT-4o / Amplifier workflows / ffmpeg-based video frame extractor  
- **Infra:** Vercel / Cloudflare / GitHub Actions (CI/CD)

---

## 📦 Core Modules
| モジュール | 内容 |
|-------------|------|
| `/app` | Next.js UI層（試合管理・スコアボード・音楽制御） |
| `/api` | Supabaseエンドポイント・AI判定処理 |
| `/ai` | GPT-4o・Amplifier・画像解析ロジック |
| `/lib` | 共通ユーティリティ |
| `/types` | 型定義・スキーマ管理 |
| `/scripts` | テスト・マイグレーション・動画処理補助 |

---

## 🧩 Agents & Roles
| エージェント | 役割 | 使用フェーズ |
|---------------|------|---------------|
| 🧭 **Architect** | 構成・設計レビュー | 初期構築・リファクタリング時 |
| 🧪 **Tester** | Jest/Playwrightを用いた自動テスト生成 | 各PR後 |
| ⚙️ **DevOps** | GitHub Actions / Supabase CLI / CI/CD管理 | 継続的 |
| 🧩 **AI-Judge** | 抑え込み判定の推論（9フレーム×0.5s） | 試合解析 |
| 🧱 **Data-Agent** | Supabaseスキーマ・整合性検証 | DB更新時 |
| 📘 **DocAgent** | README・API仕様・CHANGELOG自動更新 | RC直前 |

---

## 🧮 Priorities (Amplifierが参照する優先軸)
1. **安定性・信頼性**（試合中に止まらない）  
2. **リアルタイム性能**（抑え込み判定まで2秒以内）  
3. **UI整備**（非エンジニアでも操作可能）  
4. **自動テストとCI/CD整備**  
5. **ドキュメント自動生成・Amplifier統合**

---

## 🧱 Quality Gates
| カテゴリ | チェック内容 |
|-----------|---------------|
| コード | TypeScript strict / ESLint clean |
| テスト | coverage > 80% |
| セキュリティ | APIキー管理・CORS・XSS対策済 |
| データ | Supabaseスキーマmigration log存在 |
| AI判定 | 9-frame root evidence present |
| 配信 | OBS統合・音声遅延 < 100ms |
| ビルド | Vercel build success / no warnings |

---

## 🚀 Release Workflow
1. `amplifier run project-finisher` 実行  
2. Amplifierが未完タスクを抽出し、優先順位付け  
3. 上位3件から実装・テスト・ドキュメントを一貫処理  
4. CI/CD自動実行 → Supabaseデプロイ確認  
5. Amplifierがリリースノート・CHANGELOG作成  
6. `git tag vX.Y.Z-rc` → RCブランチへプッシュ  

---

## 🧩 Future Enhancements
- [ ] AI判定モデルの精度改善（特に下半身抑え込み検出）  
- [ ] 審判UIにスコア音声入力機能追加  
- [ ] リプレイ・ハイライト自動生成  
- [ ] オフライン大会用ローカルキャッシュ  
- [ ] DAO連携（BJJトークン／ポイント還元）

---

## 📚 Notes for Amplifier
- プロジェクトのゴール：**「AIが柔術を理解し、記録・再生・評価できる」**環境。  
- タスク優先度計算式：**Impact × (1 / Cost) × Confidence**  
- 実装時の推奨AIモデル：`gpt-4o`  
- 言語：日本語 / 英語 両対応。コメントは英語推奨。

---

©2025 JiuFlow / JJForAll DAO  


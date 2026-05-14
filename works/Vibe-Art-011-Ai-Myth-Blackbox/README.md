# AI Myth Blackbox: Experiencing the Algorithm of Faith

> **目的**: ブラウザだけで体験できる、AIが紡ぐ神話/神託/宗教的図像/記憶の曼荼羅の**没入型プロトタイプ**です。オフラインでも擬似生成で動作し、任意でサーバを起動すればOpenAI等のAPIを安全に利用できます。

https://user-images.githubusercontent.com/0000000/demo.gif

---

## 特徴
- **神託体験**: マイク/テキスト入力 → 神話的テキスト生成 → 朗読（Web Speech Synthesis）
- **図像生成**: ローカル曼荼羅（Canvas）/ 任意でAPI画像生成
- **音響演出**: WebAudioで環境ノイズと低音ドローンを合成、ムード連動
- **VR**: A-Frameで360°背景（曼荼羅を球面に投影）＋テキストの結界
- **倫理設計**: デブリーフィング（フィクション/依存と境界/悪用への注意）

> **注意**: APIキーをブラウザに直書きしないでください。本リポジトリの `server/` は**プロキシ**としてキーをサーバ側に保持します。

---

## クイックスタート（オフライン擬似生成）
```bash
# 1) 依存のインストール（フロントのみ）
npm i

# 2) 開発サーバ起動（Vite）
npm run dev
# → http://localhost:5173 が開きます

## （任意）API連携の有効化

OpenAI等のAPIを使った**高品質生成**を有効化したい場合：

```bash
# 1) サーバの依存インストール
cd server && npm i && cd ..

# 2) 環境変数を設定
cp server/.env.sample server/.env
# server/.env を編集して OPENAI_API_KEY などを設定

# 3) サーバ起動
npm run server
# → http://localhost:8787

```

フロントエンド（ [http://localhost:5173](http://localhost:5173/) ）で「設定」を開き、

- サーバーURL: `http://localhost:8787`
- 画像生成もAPIに依頼: ✅（必要なら）
- 生成モード: **API** を選択

> プロキシの役割: ブラウザからは /api/llm と /api/image へアクセスし、サーバがOpenAI APIへと中継します。APIキーはサーバ側 .env のみで管理し、クライアントには出しません。
> 

---

## デプロイ

### GitHub Pages（フロントのみ）

```bash
npm run build
# dist/ を Pages に公開

```

> API利用が必要な場合は、別ホストで server/ を稼働（Railway, Render, Fly.io 等）。
> 

### 任意のホスティング

- フロント: 任意の静的ホスティング（Vercel/Netlify/Cloudflare Pages 等）
- サーバ: Node 18+ ランタイム（CORSを自ドメインへ許可）

---

## アーキテクチャ概要

- **フロント**: Vite + Vanilla JS（ESM）
    - `src/mythEngine.js` … LLM(API)/ローカル擬似生成の切替
    - `src/speech.js` … 音声合成/音声認識ラッパ
    - `src/audio/soundscape.js` … 環境音/ドローン生成
    - `src/visuals/mandala.js` … シンメトリ曼荼羅
    - `src/visuals/vrScene.js` … A-Frameで360背景
    - `src/ui/app.js` … UI結線
- **サーバ（任意）**: Express プロキシ（OpenAI Chat/Image）

---

## 倫理と安全

- 生成は**フィクション**であり助言ではありません。健康・法律・金融等の判断は専門家へ。
- 暴力/差別/露骨な性的表現など不適切入力は控えてください。
- 入力データは保存せず、セッション目的のみに利用することを推奨します。

---

## ライセンス

MIT

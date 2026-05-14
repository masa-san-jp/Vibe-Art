# 共有された物語：AIが紡ぐ社会彫刻 — ブラウザ・プロトタイプ

AIを「現代のミューズ（霊感の媒介者）」として位置づけ、地域課題の物語化→小さな社会変革→成果を神話として可視化する、**体験可能なブラウザ・プロトタイプ**です。

<https://github.com/your-name/shared-myth-social-sculpture>

## ✨ 特徴
- **マンダラ的UI**：中心に“AIオラクル”との対話、周縁に物語カードと行動プランを展開。
- **ミューズ的対話**：AI（デフォルトはローカルの疑似生成器）が詩的な問いかけで創造性を促進。
- **社会彫刻フロー**：対話→物語原型→現実タスク（TODO）→儀礼モード（朗読）→アーカイブの雰囲気を体験。
- **オフラインでそのまま実行**（疑似生成器）。任意で OpenAI API キーを設定して実際のLLMに切替も可能（クライアント直叩き/デモ用途）。
- **ローカル保存**：会話・物語・TODOを localStorage に保存。

## 🛠 技術
- React + Vite
- Tailwind CSS + Framer Motion + lucide-react（アイコン）

## 🚀 セットアップ
```bash
# Node.js 18+ 推奨
npm install
npm run dev

ブラウザで [http://localhost:5173](http://localhost:5173/) を開きます。

## 📦 ビルド

```bash
npm run build
npm run preview

```

## 🌐 GitHub Pages にデプロイ

1. このリポジトリを GitHub に push。
2. `vite.config.js` の `base` を、自分のリポジトリ名に合わせて設定します（例：`/shared-myth-social-sculpture/`）。
3. 次を実行：

```bash
npm run deploy

```

`gh-pages` ブランチに出力され、Pages から公開できます。

> 別案：VITE_BASE 環境変数でベースを上書き可。
> 

## 🔑 実LLMの利用（任意）

右上「⚙ 設定」→「LLM を使用」にチェック→ API Key を入力でオン。

> 注意：ブラウザからの直接呼び出しはキー露出のリスクがあります。安全な本番運用ではサーバ経由でプロキシしてください。
> 

## 🧭 体験フロー

1. 画面中央のオラクルと対話（地域や関心テーマを設定）。
2. 物語の種が提示され、数往復の問いかけで**物語カード**が並びます。
3. 右側の**行動プラン**（TODO）を確認・編集→コピー共有。
4. 上部の**儀礼モード**で物語の一節を朗読（開始/終了）。

## 📁 主なディレクトリ

- `src/components` UI コンポーネント群
- `src/utils/generator.js` 疑似AIの物語/タスク生成
- `src/utils/storage.js` localStorage ラッパ
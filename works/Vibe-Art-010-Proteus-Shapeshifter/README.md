# Vibe-Art-010-Proteus-Shapeshifter
https://vibe-art.myportfolio.com/010-proteus-shapeshifter

# プロテウス・シェイプシフター：ブラウザ体験プロトタイプ

> **Proteus Shapeshifter: Avatar-Based Identity Experiment (Web Prototype)**  
> ブラウザで体験できる最小構成のデモ。**アバター切替**、**感情オーラ**、**速度／力試験（簡易）**、**高所恐怖の自己観察（軽度）**、**同意と退出の導線**を含みます。

---

## 体験できること
- **アバター切替（1〜5キー or 画面上ボタン）**
  - Human / Robot / Creature（Fox）/ Divine Light（光体）/ Elder（高齢を模擬）
- **感情オーラ（UIボタン）**：Calm / Joy / Anger で環境色や発光を変化
- **タスクゾーン**
  - **Speed Track**：アバターごとに移動加速度を変更
  - **Strength Test**：Robot / Divine Light のみ「重い箱」をドラッグ可能（デスクトップ）
  - **High Ledge**：高所見下ろしで“感じ”の違いを自己観察（VR/2D）
- **視点切替**：`V` で一人称／三人称切替（簡易）

> ⚠️ VRモードは対応ブラウザ＋HMDが必要です（Quest の Oculus Browser など）。2Dでも操作可能。

---

## クイックスタート
### 1) ローカル実行
WebGL で外部アセットを読むため、**HTTPサーバ**での起動を推奨します。

```bash
# Node.js があれば
npm install
npm run start
# => http://localhost:8080 を開く

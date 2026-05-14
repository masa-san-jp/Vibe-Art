# 霊脈曼荼羅 – Particle + Mic Edition (p5.js)

> **最新アップデート**
> - **フルスクリーン対応**（HUDボタン / `F` キー）
> - **カメラ不要**：**マイク入力のみ**でパラメータが動的に変化
> - **中央寄せの確実化**：曼荼羅が常に**ブラウザ中央**に表示されるよう頂点シェーダを修正
> - **微細粒子による色表現**：加算合成で“重なり”から色が現れる表現を強化

---

## 1) 作品概要

「霊脈曼荼羅（Reimyaku Mandala）」は、**反応拡散**（Gray–Scott）をベースに、**微細粒子（Nano Particles）**の**加算合成**と**回転対称（カレイド）**を重ね、**音声（マイク）**に反応して進化するジェネラティブ・アートです。
本エディションは**マイクのみ**で動作し、**フルスクリーン**で没入的に鑑賞できます。

- フルスクリーンはユーザー操作（ボタン/キー）からのみ切替可能です。ブラウザ仕様により、**ユーザー入力なしの自動切替は不可**です。:contentReference[oaicite:0]{index=0}
- マイクは **HTTPS または localhost** での提供が推奨です（ブラウザの権限制約）。:contentReference[oaicite:1]{index=1}

---

## 2) 体験方法（Quick Start）

1. 任意の静的サーバで公開（例）
   - Python: `python3 -m http.server 8000`
   - Node: `npx http-server` または `npx serve`
2. ブラウザで `http://localhost:8000/` を開く
3. HUD の **Mic ON/OFF** ボタンを押し、ブラウザの許可ダイアログで**許可**
4. HUD の **⛶ Fullscreen** か **`F`** キーでフルスクリーンへ（再度で解除）。:contentReference[oaicite:2]{index=2}

> マイクが動作しない場合は、HTTPS で配信しているか、`localhost` で開いているかを確認してください。:contentReference[oaicite:3]{index=3}

---

## 3) 操作

- **マイク**：
  - **low（低域）** → 反応拡散への注入量/脈動
  - **mid（中域）** → 反応係数（F/k）→ 模様コントラスト
  - **high（高域）** → 細粒子の煌めき/色収差の強さ
  解析は `p5.FFT`（0–255 の配列を返す）で行います。:contentReference[oaicite:4]{index=4}
- **キー**：
  - `1..4`：対称数/テーマ切替
  - `C`：パレット循環
  - `X`：Cosine / Sinebow パレット切替
  - `V`：Psy 強度（彩度・コントラストの押し出し）
  - `B`：ポスタライズ（OFF / 8 / 16）
  - `R`：反応拡散フィールド再初期化
  - `Space`：フラッシュ（注入半径一時拡大）
  - `P`：PNG保存
  - `F`：フルスクリーン切替（ユーザー入力時のみ可）:contentReference[oaicite:5]{index=5}

---

## 4) 実装の要点

### (a) 反応拡散：GPU（WebGL）で ping-pong
- `p5.Framebuffer` を用いて**高速な描画面**を作成し、2枚のFBOで**ping-pong**更新（前フレーム→次フレーム）。
  Framebuffer は **WebGL 同一コンテキストのテクスチャ面**として高速に扱えます。:contentReference[oaicite:6]{index=6}

### (b) 微細粒子：加算合成で“重なり”から色を作る
- 数千〜万単位の微粒子を `p5.Graphics` 上に描画し、**`blendMode(ADD)`** で合成。**色は粒子の重なり**として立ち上がります。ADD は 2D/WEBGL の両方で利用可能です。:contentReference[oaicite:7]{index=7}

### (c) 回転対称（カレイド）＋中心固定
- フルスクリーンクアッド用の頂点シェーダ（`gl_Position` を **[-1..1]** へ正規化）で**中央寄せ**を担保。
- フラグメント側で極座標/セクター折返しを行い、`uMandalaScale` による**中央スケーリング**と**円形マスク**で画面中央に曼荼羅を固定配置。

### (d) 音解析（p5.sound）
- `p5.AudioIn.start()` → `p5.FFT.setInput(mic)` → `fft.analyze()` の流れで、**周波数別エネルギー**を取得し、各パラメータにマッピング。:contentReference[oaicite:8]{index=8}

---

## 5) ファイル構成

index.html   # p5.js / p5.sound をCDN読み込み、HUD/UI配置

style.css    # HUD/トップバー/ボタンなどのスタイル

sketch.js    # 反応拡散（FBO）、粒子、カレイド、FFT、フルスクリーン実装

.env.example # 外部APIを使う際の雛形（本エディションでは未使用）


---

## 6) よくある質問 / トラブルシュート

- **マイクが反応しない**
  - ブラウザの**マイク許可**が必要です。
  - **HTTPS** あるいは `localhost` で提供してください（Chrome等の制限）。:contentReference[oaicite:9]{index=9}
  - `Mic ON/OFF` のボタンを押してから発声してください（`setInput(mic)` が有効化されます）。:contentReference[oaicite:10]{index=10}

- **フルスクリーンにならない**
  - **ユーザー操作**（ボタン/キー）からのみ切替可能です。自動では切り替わりません。:contentReference[oaicite:11]{index=11}

- **パフォーマンスが重い**
  - ウィンドウを小さくする／`V` キーで Psy 強度を下げる／粒子数を `sketch.js` の `nanoCount` で調整
  - FBO は通常の `p5.Graphics` より**テクスチャ利用で高速**です（環境により差あり）。:contentReference[oaicite:12]{index=12}

---

## 7) 拡張のヒント（任意）

- **録画**：HUD の ⏺ / ⏹ で WebM 保存（`MediaRecorder`）。
- **ギャラリー連携**（将来）：外部API利用時は `.env` でキーを管理。
- **ジェスチャ入力**：必要ならカメラ＋Poseを追加できます（本版はマイクのみ）。

---

## 8) ライセンス / クレジット

- ランタイム：**p5.js / p5.sound**（MIT）
- 参考：
  - `fullscreen()` の仕様と入力制限（ユーザー操作でのみ許可） :contentReference[oaicite:13]{index=13}
  - `p5.AudioIn` / `p5.FFT`（マイク取得・周波数解析） :contentReference[oaicite:14]{index=14}
  - `blendMode(ADD)`（加算合成、2D/WEBGL対応） :contentReference[oaicite:15]{index=15}
  - `createFramebuffer()` / Layered Rendering（FBO による高速レンダリング） :contentReference[oaicite:16]{index=16}

# AIと自己変容の対話的儀式：デジタル・シャイニングパス
*(Digital Shining Path: A Ritual of Dialogue with AI for Self-Transformation)*

[![CI](https://github.com/USERNAME/DigitalShiningPath/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/DigitalShiningPath/actions/workflows/ci.yml)

AIを「デジタル導師」と見立て、**物語・内観図（曼荼羅）・音響**を個人ごとに生成する体験型アート作品のテンプレートです。  
CLIスクリプトで参加者の電子シミュレーション（デモ）を生成し、Webで体験できます。

---

## 特長
- 参加者ごとの**神話的物語**（TXT）
- **曼荼羅画像**（PNG, 印刷可）
- **アンビエント音響**（WAV/MP3）
- **体験ページ**（HTML単一ファイル）
- セーフティ/プライバシー配慮の運用ガイド（`docs/仕様書.md`）

---

## クイックスタート
```bash
# 1) 依存のインストール
python -m pip install -r requirements.txt

# 2) シミュレーション出力（3名 / 60秒オーディオ）
python tools/simulate.py --participants 3 --out ./DSP_Sim --duration 60

# 3) WAV→MP3 変換（ffmpeg推奨 / pydubフォールバック）
python tools/export_mp3.py --root ./DSP_Sim --bitrate 192k

# 4) 体験
# ブラウザで DSP_Sim/index.html を開く

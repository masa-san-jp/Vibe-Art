# Vibe-Art

Vibe-Art is a series of interactive web artworks exploring memory, myth, ritual,
identity, and the boundaries between humans, machines, and other forms of life.

These works treat AI not as an authority or a substitute for human experience,
but as a medium through which new forms of dialogue, projection, and collective
imagination can emerge. Through sound, image, code, participation, and simulated
ritual, the series asks how our memories and beliefs are transformed in a world
increasingly mediated by computation.

The series also considers the responsibilities that come with these experiences:
consent, privacy, psychological safety, human agency, and the difference between
a meaningful encounter and a convincing simulation.

このリポジトリは、Vibe-Artシリーズの作品群を保存・参照するためのアーカイブです。
各作品は独立したブラウザ体験であり、記憶、神話、儀式、アイデンティティ、
人間と機械・非人間的生命の境界を、生成技術と参加型インタラクションを通して探ります。

AIは答えを与える権威や実在の人格の代替ではなく、対話・投影・共同的な想像力を
生み出すための媒介として扱われます。作品内の「祖霊」や「神託」もまた、
実在そのものではなく、記憶や信念が計算によってどのように再構成されるかを問う
シミュレーションです。

## How to approach the archive

This is not a single application with one root-level start command. Each directory
under `works/` is a preserved, independent work. Some can be opened as static web
experiences; others require a local development server and dependencies. Start with
the README inside the work you want to experience.

For browser-based works that use microphone or camera input, serve the directory
from `localhost` or HTTPS rather than opening the HTML file directly. Permissions,
audio, and camera access are intentionally part of the interaction, and each work
documents its own requirements and safety notes.

## Works

| Work | Source repository | Focus |
| --- | --- | --- |
| `works/Vibe-Art-001-DigitalShiningPath/` | `Vibe-Art-001-DigitalShiningPath` | AI dialogue, self-transformation, simulated ritual |
| `works/Vibe-Art-002-Algorithmic-Nostalgia/` | `Vibe-Art-002-Algorithmic-Nostalgia` | Algorithmic memory and nostalgia |
| `works/Vibe-Art-008-Microcosmos-Ritual/` | `Vibe-Art-008-Microcosmos-Ritual` | Microbial symbiosis, ecology, rites of passage |
| `works/Vibe-Art-009-Deep-Memory-Mandala/` | `Vibe-Art-009-Deep-Memory-Mandala` | Deep memory and mandala |
| `works/Vibe-Art-010-Proteus-Shapeshifter/` | `Vibe-Art-010-Proteus-Shapeshifter` | Avatar, identity, embodiment |
| `works/Vibe-Art-011-Ai-Myth-Blackbox/` | `Vibe-Art-011-Ai-Myth-Blackbox` | AI myth, oracle, image, sound, and belief |
| `works/Vibe-Art-012-Nostalgia-Landscape/` | `Vibe-Art-012-Nostalgia-Landscape` | Collective memory, landscape, and nostalgia |
| `works/Vibe-Art-013-Ethical-Audit/` | `Vibe-Art-013-Ethical-Audit` | AI ethics, agency, trust, and responsibility |
| `works/Vibe-Art-014-Digital-Fragments/` | `Vibe-Art-014-Digital-Fragments` | Destruction, regeneration, impermanence |
| `works/Vibe-Art-015-Shared-Mythology/` | `Vibe-Art-015-Shared-Mythology` | Shared stories, social sculpture, action |
| `works/Vibe-Art-016-Resonance-of-Digital-Ancestral-Spirits/` | `Vibe-Art-016-Resonance-of-Digital-Ancestral-Spirits` | AI ancestry, voice, light, and simulation |
| `works/Vibe-Art-017-Whispers-of-the-Ancestors/` | `Vibe-Art-017-Whispers-of-the-Ancestors` | Microbial life, voice, movement, and resonance |
| `works/Vibe-Art-018-Final-Ritual/` | `Vibe-Art-018-Final-Ritual` | Farewell, return, rebirth, and impermanence |
| `works/Vibe-Art-019-Reimyaku-Mandala/` | `Vibe-Art-019-Reimyaku-Mandala` | Sound-reactive particles, flow, and mandala |
| `works/Vibe-Art-020-Corridor-of-Memory-Beyond-the-Simulacra/` | `Vibe-Art-020-Corridor-of-Memory-Beyond-the-Simulacra` | Memory beyond representation and simulacra |

## Structure

Each former repository is preserved under `works/<original-repository-name>/`.

Original `.git` directories are not included. Source repository names are kept in directory names so old references remain traceable.

The numbering follows the source series. This archive currently contains the works listed above; the gaps in numbering are retained rather than renumbered.

## Source

Most works refer to the Vibe-Art portfolio:

https://vibe-art.myportfolio.com/

## Technical paths across the works / 作品ごとの技術的な入口

The archive preserves different production approaches rather than a shared runtime:

- [Digital Shining Path (001)](works/Vibe-Art-001-DigitalShiningPath/README.md) uses Python CLI tools to generate participant-specific text, mandala images, audio and an HTML experience. The generated page is the browser-facing output; the work has a generation step before viewing.
- [Reimyaku Mandala (019)](works/Vibe-Art-019-Reimyaku-Mandala/README.md) is a p5.js / p5.sound browser work. Microphone frequency bands affect a WebGL reaction-diffusion field and additive particles, making the visitor's sound part of the evolving image. It needs microphone permission and a suitable localhost/HTTPS context.

作品001は「素材を生成してから体験ページを見る」構成、作品019は「その場のマイク入力で描画が変化する」構成です。前者はPython等の準備、後者はブラウザの音声入力・描画機能が入口になります。AIというシリーズ共通の主題から、全作品が同じモデルAPIや実行環境を使うとは限りません。依存関係・操作・安全上の注意は各作品のREADMEとソースを基準に確認してください。


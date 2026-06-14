# ☕ regexpresso

> 淹れたての正規表現を、その場で味見。— A developer-friendly regex playground.

正規表現を書くたびに調べ直す手間をなくすための、ブラウザだけで完結するwebツールです。
ライブで一致を確認し、式の構造をグラフィカルに分解し、よく使う書き方をすぐ引けます。

**🔗 公開URL:** `https://ilolio.github.io/regexpresso/`

## できること

- **ライブ・ハイライト** — 入力した瞬間に、一致箇所を色分けでハイライト。複数一致も色で区別。
- **構造を分解** — 正規表現を人間が読める階層ツリーに分解。数量子・グループ・先読み・後方参照などを日本語で説明。
- **一致 / グループ** — マッチごとに位置・キャプチャグループ・名前付きグループを一覧。
- **置換プレビュー** — `$1` や `$<name>` を使った置換結果をリアルタイムに確認。
- **設定プリセット** — 利用シーンに合わせて、フラグ既定とコピー形式をまとめて切り替え。
  | プリセット | 既定フラグ | コピー形式 |
  |---|---|---|
  | **VSCode**（初期値） | `gimu` | パターンのみ（区切り文字なし） |
  | **JavaScript** | `g` | `/pattern/flags` リテラル |
  | **Python** | `g` | `r"pattern"`（raw 文字列） |
- **フラグをワンタップ** — `g i m s u y` をトグルで切り替え。現在のプリセットの既定フラグには印が付き、tips からワンクリックでリセット可能。
- **早見表** — クリックでパターンに挿入できるチートシート。検索付き。
- **スニペット集** — メール / URL / 日付 / 電話番号 / IPアドレスなど、すぐ使える実用パターン。
- **共有リンク** — 現在の式・テキスト・置換をURLに埋め込んで共有。
- **ダーク / ライト** — エスプレッソ・ローストとオートミルク・ラテの2テーマ。
- **プライバシー** — 入力はすべてブラウザ内で処理され、どこにも送信されません。

## URL パラメータで初期設定を指定

`?preset=` で初期プリセットを指定できます（共有リンクや好みのデフォルトに）。

| URL | 初期プリセット |
|---|---|
| `?preset=vscode` | VSCode（既定） |
| `?preset=js` / `?preset=javascript` | JavaScript |
| `?preset=python` | Python |

例: `https://ilolio.github.io/regexpresso/?preset=python`

共有リンク（🔗）はパターン・テキスト・フラグ・プリセットをまとめて URL に埋め込むため、そのまま再現されます。

## 技術

ビルド不要。プレーンなHTML / CSS / JavaScript のみ。`index.html` を開くだけで動きます。

```
regexpresso/
├── index.html
└── assets/
    ├── css/style.css
    └── js/
        ├── data.js      # チートシート & スニペット定義
        ├── explain.js   # 正規表現を分解するパーサ
        └── app.js       # メインロジック
```

## ローカルで動かす

```bash
# どれでもOK
python3 -m http.server 8000
# → http://localhost:8000
```

ファイルを直接ブラウザで開いても動作します。

## デプロイ (GitHub Pages)

`main` ブランチへの push で `.github/workflows/deploy.yml` が自動的に Pages へ公開します。
リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。

## ライセンス

[MIT](LICENSE)

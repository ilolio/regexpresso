/* regexpresso — reference data: cheat sheet tokens + ready-made snippets */
window.REGEXPRESSO_DATA = (function () {
  const cheat = [
    {
      group: "文字クラス",
      items: [
        { tok: ".", desc: "改行以外の任意の1文字" },
        { tok: "\\d", desc: "数字 [0-9]" },
        { tok: "\\D", desc: "数字以外" },
        { tok: "\\w", desc: "単語構成文字 [A-Za-z0-9_]" },
        { tok: "\\W", desc: "単語構成文字以外" },
        { tok: "\\s", desc: "空白（スペース・タブ・改行）" },
        { tok: "\\S", desc: "空白以外" },
        { tok: "[abc]", desc: "a, b, c のいずれか" },
        { tok: "[^abc]", desc: "a, b, c 以外" },
        { tok: "[a-z]", desc: "範囲指定（a〜z）" },
      ],
    },
    {
      group: "数量子",
      items: [
        { tok: "*", desc: "0回以上" },
        { tok: "+", desc: "1回以上" },
        { tok: "?", desc: "0回または1回（省略可）" },
        { tok: "{3}", desc: "ちょうど3回" },
        { tok: "{2,5}", desc: "2〜5回" },
        { tok: "{2,}", desc: "2回以上" },
        { tok: "*?", desc: "最小一致（lazy）" },
      ],
    },
    {
      group: "アンカー / 境界",
      items: [
        { tok: "^", desc: "行（文字列）の先頭" },
        { tok: "$", desc: "行（文字列）の末尾" },
        { tok: "\\b", desc: "単語境界" },
        { tok: "\\B", desc: "単語境界以外" },
      ],
    },
    {
      group: "グループ / 参照",
      items: [
        { tok: "(...)", desc: "キャプチャグループ" },
        { tok: "(?:...)", desc: "非キャプチャグループ" },
        { tok: "(?<name>...)", desc: "名前付きグループ" },
        { tok: "\\1", desc: "後方参照（1番目）" },
        { tok: "\\k<name>", desc: "名前付き後方参照" },
        { tok: "a|b", desc: "a または b（選択）" },
      ],
    },
    {
      group: "先読み / 後読み",
      items: [
        { tok: "(?=...)", desc: "肯定先読み" },
        { tok: "(?!...)", desc: "否定先読み" },
        { tok: "(?<=...)", desc: "肯定後読み" },
        { tok: "(?<!...)", desc: "否定後読み" },
      ],
    },
    {
      group: "エスケープ",
      items: [
        { tok: "\\.", desc: "リテラルのドット" },
        { tok: "\\/", desc: "リテラルのスラッシュ" },
        { tok: "\\\\", desc: "リテラルのバックスラッシュ" },
        { tok: "\\n", desc: "改行" },
        { tok: "\\t", desc: "タブ" },
        { tok: "\\uXXXX", desc: "Unicodeコードポイント" },
      ],
    },
  ];

  const snippets = [
    {
      name: "メールアドレス",
      tags: "email mail メール",
      pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+",
      flags: "g",
      sample: "連絡先: hello@example.com, support+billing@regexpresso.dev",
    },
    {
      name: "URL (http/https)",
      tags: "url link リンク web",
      pattern: "https?:\\/\\/[\\w.-]+(?:\\/[\\w./?%&=#-]*)?",
      flags: "g",
      sample: "https://github.com/ilolio/regexpresso と http://example.com/path?q=1",
    },
    {
      name: "日付 YYYY-MM-DD",
      tags: "date 日付 ymd",
      pattern: "(\\d{4})-(\\d{2})-(\\d{2})",
      flags: "g",
      sample: "予定: 2026-06-13 と 2025-12-31、不正な 13-13-13",
    },
    {
      name: "時刻 HH:MM(:SS)",
      tags: "time 時刻",
      pattern: "([01]?\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?",
      flags: "g",
      sample: "開始 09:30、終了 23:59:59",
    },
    {
      name: "日本の郵便番号",
      tags: "zip postal 郵便番号 japan",
      pattern: "\\d{3}-\\d{4}",
      flags: "g",
      sample: "〒150-0001 東京都渋谷区、100-0005 千代田区",
    },
    {
      name: "日本の携帯番号",
      tags: "phone tel 電話 携帯",
      pattern: "0[789]0-\\d{4}-\\d{4}",
      flags: "g",
      sample: "090-1234-5678 / 080-0000-0000 / 固定 03-1234-5678",
    },
    {
      name: "IPv4アドレス",
      tags: "ip ipv4 network",
      pattern: "(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)",
      flags: "g",
      sample: "192.168.0.1, 10.0.0.255, 256.1.1.1 は無効",
    },
    {
      name: "16進カラーコード",
      tags: "color hex css カラー",
      pattern: "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b",
      flags: "g",
      sample: "背景 #fff、アクセント #c98a4b、無効 #12",
    },
    {
      name: "ハッシュタグ",
      tags: "hashtag tag sns",
      pattern: "#[\\p{L}\\p{N}_]+",
      flags: "gu",
      sample: "#正規表現 楽しい #regex #regexpresso2026",
    },
    {
      name: "@メンション",
      tags: "mention sns user",
      pattern: "@[A-Za-z0-9_]{1,30}",
      flags: "g",
      sample: "@ilolio さんありがとう cc @regexpresso",
    },
    {
      name: "重複した単語",
      tags: "duplicate backreference 後方参照",
      pattern: "\\b(\\w+)\\s+\\1\\b",
      flags: "gi",
      sample: "the the cat sat on on the mat",
    },
    {
      name: "全角→半角の候補抽出",
      tags: "全角 数字 zenkaku",
      pattern: "[０-９]+",
      flags: "g",
      sample: "価格は１２３４円、個数は５個です",
    },
    {
      name: "強いパスワード（先読み）",
      tags: "password lookahead 先読み",
      pattern: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w]).{8,}",
      flags: "",
      sample: "Aa1!aaaa は合格 / weakpass は不合格",
    },
    {
      name: "コメント行を除外して抽出",
      tags: "comment code negative",
      pattern: "^(?!\\s*#).+$",
      flags: "gm",
      sample: "# これはコメント\nname = value\n  # インデントされたコメント\nport = 8080",
    },
  ];

  return { cheat, snippets };
})();

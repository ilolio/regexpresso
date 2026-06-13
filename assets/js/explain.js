/* regexpresso — regex structure explainer
 * Parses a JS regex pattern string into a nested tree of human-readable nodes.
 * Not a full engine — a pragmatic tokenizer good enough to teach & visualize. */
window.RegexExplain = (function () {
  "use strict";

  const QUANT_NAME = {
    "*": "0回以上の繰り返し",
    "+": "1回以上の繰り返し",
    "?": "省略可能（0回または1回）",
  };

  function quantText(q) {
    if (QUANT_NAME[q[0]]) {
      let t = QUANT_NAME[q[0]];
      if (q.endsWith("?") && q.length > 1) t += "・最小一致(lazy)";
      return t;
    }
    // {n}, {n,}, {n,m}
    const m = /^\{(\d*)(,?)(\d*)\}(\??)$/.exec(q);
    if (m) {
      const [, n, comma, mx, lazy] = m;
      let t;
      if (comma && mx) t = `${n}〜${mx}回の繰り返し`;
      else if (comma) t = `${n}回以上の繰り返し`;
      else t = `ちょうど${n}回`;
      if (lazy) t += "・最小一致(lazy)";
      return t;
    }
    return "繰り返し";
  }

  const CLASS_DESC = {
    "\\d": "数字 (0-9)",
    "\\D": "数字以外",
    "\\w": "単語構成文字 (A-Z a-z 0-9 _)",
    "\\W": "単語構成文字以外",
    "\\s": "空白文字",
    "\\S": "空白以外",
    "\\b": "単語の境界",
    "\\B": "単語境界以外",
    "\\n": "改行",
    "\\t": "タブ",
    "\\r": "復帰",
    "\\f": "改ページ",
    "\\v": "垂直タブ",
    "\\0": "ヌル文字",
  };

  function makeNode(label, detail, kind) {
    return { label, detail: detail || "", kind: kind || "atom", children: [] };
  }

  // Parse a character class body like a-z0-9_
  function describeClass(body, negated) {
    const parts = [];
    let i = 0;
    while (i < body.length) {
      // escape
      if (body[i] === "\\") {
        const two = body.slice(i, i + 2);
        parts.push(CLASS_DESC[two] || `文字 ${two}`);
        i += 2;
        continue;
      }
      // range a-z
      if (body[i + 1] === "-" && i + 2 < body.length && body[i + 2] !== "]") {
        parts.push(`${body[i]}〜${body[i + 2]}`);
        i += 3;
        continue;
      }
      parts.push(`'${body[i]}'`);
      i += 1;
    }
    const list = parts.join(" / ");
    return negated
      ? `次のいずれでもない1文字: ${list}`
      : `次のいずれか1文字: ${list}`;
  }

  // Main recursive parser. Returns {nodes, end}
  function parseSeq(src, pos, stopChars) {
    const nodes = [];
    let i = pos;
    while (i < src.length) {
      const c = src[i];
      if (stopChars && stopChars.indexOf(c) !== -1) break;

      let node = null;
      let nextI = i + 1;

      if (c === "(") {
        const res = parseGroup(src, i);
        node = res.node;
        nextI = res.end;
      } else if (c === "[") {
        const res = parseCharClass(src, i);
        node = res.node;
        nextI = res.end;
      } else if (c === "|") {
        // alternation handled at higher level; mark separator
        nodes.push({ alt: true });
        i += 1;
        continue;
      } else if (c === "^") {
        node = makeNode("^", "行（または文字列）の先頭", "anchor");
      } else if (c === "$") {
        node = makeNode("$", "行（または文字列）の末尾", "anchor");
      } else if (c === ".") {
        node = makeNode(".", "任意の1文字（dotAllでなければ改行を除く）", "meta");
      } else if (c === "\\") {
        const two = src.slice(i, i + 2);
        nextI = i + 2;
        if (/\d/.test(src[i + 1])) {
          node = makeNode(two, `後方参照（${src[i + 1]}番目のグループと同じ文字列）`, "ref");
        } else if (src[i + 1] === "k") {
          const m = /^\\k<([^>]+)>/.exec(src.slice(i));
          if (m) {
            node = makeNode(m[0], `名前付き後方参照 (${m[1]})`, "ref");
            nextI = i + m[0].length;
          } else {
            node = makeNode(two, CLASS_DESC[two] || `エスケープ文字`, "class");
          }
        } else if (src[i + 1] === "u" || src[i + 1] === "x") {
          const m = /^\\(?:u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2})/.exec(src.slice(i));
          if (m) {
            node = makeNode(m[0], "Unicode/16進で指定した文字", "class");
            nextI = i + m[0].length;
          } else node = makeNode(two, "エスケープ", "class");
        } else if (src[i + 1] === "p" || src[i + 1] === "P") {
          const m = /^\\[pP]\{[^}]+\}/.exec(src.slice(i));
          if (m) {
            node = makeNode(m[0], "Unicodeプロパティ", "class");
            nextI = i + m[0].length;
          } else node = makeNode(two, "エスケープ", "class");
        } else {
          node = makeNode(two, CLASS_DESC[two] || `リテラル文字 '${src[i + 1]}'`, CLASS_DESC[two] ? "class" : "literal");
        }
      } else {
        // literal run: gather consecutive literals into one node for readability
        let lit = "";
        let j = i;
        while (j < src.length) {
          const ch = src[j];
          if ("(){}[]|^$.*+?\\".indexOf(ch) !== -1) break;
          if (stopChars && stopChars.indexOf(ch) !== -1) break;
          // stop if a quantifier would apply only to the last char
          const after = src[j + 1];
          if (after && "*+?{".indexOf(after) !== -1 && j > i) break;
          lit += ch;
          j += 1;
        }
        if (lit.length > 1) {
          node = makeNode(lit, `文字列 "${lit}" にそのまま一致`, "literal");
          nextI = i + lit.length;
        } else {
          node = makeNode(c, `文字 '${c}' にそのまま一致`, "literal");
          nextI = i + 1;
        }
      }

      // quantifier?
      const q = readQuantifier(src, nextI);
      if (q) {
        node.quant = q.text;
        node.quantDetail = quantText(q.text);
        nextI = q.end;
      }
      nodes.push(node);
      i = nextI;
    }
    return { nodes, end: i };
  }

  function readQuantifier(src, i) {
    const c = src[i];
    if (c === "*" || c === "+" || c === "?") {
      let end = i + 1;
      if (src[end] === "?") end += 1;
      return { text: src.slice(i, end), end };
    }
    if (c === "{") {
      const m = /^\{\d*,?\d*\}\??/.exec(src.slice(i));
      if (m) return { text: m[0], end: i + m[0].length };
    }
    return null;
  }

  function parseCharClass(src, i) {
    let j = i + 1;
    let negated = false;
    if (src[j] === "^") { negated = true; j += 1; }
    let body = "";
    while (j < src.length && src[j] !== "]") {
      if (src[j] === "\\") { body += src.slice(j, j + 2); j += 2; }
      else { body += src[j]; j += 1; }
    }
    const end = j + 1; // skip ]
    const raw = src.slice(i, end);
    const node = makeNode(raw, describeClass(body, negated), "class");
    return { node, end };
  }

  function parseGroup(src, i) {
    let j = i + 1;
    let head = "(";
    let label = "キャプチャグループ";
    let kind = "group";
    if (src[j] === "?") {
      if (src[j + 1] === ":") { label = "非キャプチャグループ"; head = "(?:"; j += 2; }
      else if (src[j + 1] === "=") { label = "肯定先読み — 後ろに続くか確認（消費しない）"; head = "(?="; kind = "look"; j += 2; }
      else if (src[j + 1] === "!") { label = "否定先読み — 後ろに続かないか確認"; head = "(?!"; kind = "look"; j += 2; }
      else if (src[j + 1] === "<" && src[j + 2] === "=") { label = "肯定後読み — 直前を確認"; head = "(?<="; kind = "look"; j += 3; }
      else if (src[j + 1] === "<" && src[j + 2] === "!") { label = "否定後読み — 直前にないか確認"; head = "(?<!"; kind = "look"; j += 3; }
      else if (src[j + 1] === "<") {
        const m = /^\(\?<([^>]+)>/.exec(src.slice(i));
        if (m) { label = `名前付きグループ「${m[1]}」`; head = m[0]; j = i + m[0].length; }
      }
    }
    // parse inner sequence, splitting on top-level alternation
    const inner = parseSeq(src, j, ")");
    const end = inner.end + 1; // skip )
    const node = makeNode(src.slice(i, end), label, kind);
    node.head = head;
    node.children = groupAlternatives(inner.nodes);

    // quantifier on group is handled by caller, but detect for label clarity
    return { node, end };
  }

  // Convert a flat node list containing {alt:true} separators into either the
  // same list (no alts) or an "alternation" wrapper with branch children.
  function groupAlternatives(nodes) {
    if (!nodes.some((n) => n.alt)) return nodes;
    const branches = [];
    let cur = [];
    for (const n of nodes) {
      if (n.alt) { branches.push(cur); cur = []; }
      else cur.push(n);
    }
    branches.push(cur);
    const wrap = makeNode("選択 (|)", `次のいずれかに一致（${branches.length}通り）`, "alt");
    wrap.branches = branches;
    return [wrap];
  }

  function parse(pattern) {
    const seq = parseSeq(pattern, 0, "");
    return groupAlternatives(seq.nodes);
  }

  return { parse };
})();

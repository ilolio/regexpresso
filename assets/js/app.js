/* regexpresso — main app */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const DATA = window.REGEXPRESSO_DATA;

  const el = {
    pattern: $("#pattern"),
    flagsEcho: $("#flags-echo"),
    flagBar: $("#flag-bar"),
    test: $("#test-input"),
    highlight: $("#highlight"),
    error: $("#error-line"),
    matchCount: $("#match-count"),
    explain: $("#explain-out"),
    matches: $("#matches-out"),
    replaceInput: $("#replace-input"),
    replaceOut: $("#replace-out"),
    cheatList: $("#cheat-list"),
    snippetList: $("#snippet-list"),
    refSearch: $("#ref-search"),
    toast: $("#toast"),
    patternWrap: $("#pattern-wrap"),
    delimLead: $("#delim-lead"),
    delimTrail: $("#delim-trail"),
    presetSwitch: $("#preset-switch"),
    flagTip: $("#flag-tip"),
    flagTipLabel: $("#flag-tip-label"),
  };

  /* ---------- presets ----------
   * 各プリセットは「既定フラグ」と「コピー/表示の形式」をまとめて定義する。
   * copy 形式:
   *   literal → /pattern/flags   (区切り文字あり)
   *   bare    → pattern          (区切りなし。VSCode の検索ボックス相当)
   *   python  → r"pattern"       (Python の raw 文字列) */
  const PRESETS = {
    vscode: { label: "VSCode", flags: ["g", "i", "m", "u"], copy: "bare", lead: "/", trail: "/" },
    javascript: { label: "JavaScript", flags: ["g"], copy: "literal", lead: "/", trail: "/" },
    python: { label: "Python", flags: ["g"], copy: "python", lead: 'r"', trail: '"' },
  };
  const DEFAULT_PRESET = "vscode";

  const state = { flags: new Set(PRESETS[DEFAULT_PRESET].flags), preset: DEFAULT_PRESET };

  /* ---------- utilities ---------- */
  function escapeHtml(s) {
    return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.toast.classList.remove("show"), 1800);
  }
  async function copy(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg || "コピーしました");
    } catch {
      toast("コピーに失敗しました");
    }
  }

  function flagsString() {
    return ["g", "i", "m", "s", "u", "y"].filter((f) => state.flags.has(f)).join("");
  }

  function buildRegex() {
    const pat = el.pattern.value;
    if (!pat) return { regex: null, error: null };
    try {
      return { regex: new RegExp(pat, flagsString()), error: null };
    } catch (e) {
      return { regex: null, error: e.message };
    }
  }

  /* ---------- core run ---------- */
  function run() {
    const flags = flagsString();
    el.flagsEcho.textContent = flags;
    const { regex, error } = buildRegex();

    if (error) {
      el.error.textContent = "⚠ " + error;
      el.error.classList.add("show");
      el.pattern.classList.add("invalid");
    } else {
      el.error.classList.remove("show");
      el.pattern.classList.remove("invalid");
    }

    renderHighlight(regex);
    renderExplain();
    renderMatches(regex);
    renderReplace(regex);
    syncScroll();
    persist();
  }

  function collectMatches(regex, text) {
    const out = [];
    if (!regex || !text) return out;
    if (regex.global || regex.sticky) {
      const re = new RegExp(regex.source, regex.flags);
      let m;
      let guard = 0;
      while ((m = re.exec(text)) !== null) {
        out.push(m);
        if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-width loop
        if (++guard > 100000) break;
      }
    } else {
      const m = regex.exec(text);
      if (m) out.push(m);
    }
    return out;
  }

  /* ---------- highlight ---------- */
  const HL_COLORS = 6;
  function renderHighlight(regex) {
    const text = el.test.value;
    if (!regex || !text || el.error.classList.contains("show")) {
      el.highlight.innerHTML = escapeHtml(text) + "\n";
      el.matchCount.textContent = "0 件一致";
      return;
    }
    const matches = collectMatches(regex, text);
    el.matchCount.textContent = `${matches.length} 件一致`;
    let html = "";
    let last = 0;
    matches.forEach((m, idx) => {
      const start = m.index;
      const end = start + m[0].length;
      html += escapeHtml(text.slice(last, start));
      const cls = "mk c" + (idx % HL_COLORS);
      const inner = m[0].length === 0 ? '<span class="zero">∅</span>' : escapeHtml(m[0]);
      html += `<mark class="${cls}" data-i="${idx}" title="一致 #${idx + 1} @${start}">${inner}</mark>`;
      last = end;
    });
    html += escapeHtml(text.slice(last));
    el.highlight.innerHTML = html + "\n";
  }

  /* ---------- explain ---------- */
  function renderExplain() {
    const pat = el.pattern.value;
    if (!pat) {
      el.explain.innerHTML = '<p class="empty">パターンを入力すると、ここに構造の分解が表示されます。</p>';
      return;
    }
    let tree;
    try {
      tree = window.RegexExplain.parse(pat);
    } catch {
      el.explain.innerHTML = '<p class="empty">この式は分解できませんでした。</p>';
      return;
    }
    el.explain.innerHTML = `<ul class="tree">${renderNodes(tree)}</ul>`;
  }

  function renderNodes(nodes) {
    return nodes.map(renderNode).join("");
  }
  function renderNode(node) {
    if (node.branches) {
      const branches = node.branches
        .map(
          (b, i) =>
            `<li class="branch"><span class="branch-tag">分岐 ${i + 1}</span><ul class="tree">${renderNodes(b)}</ul></li>`
        )
        .join("");
      return `<li class="node alt"><div class="node-row"><code class="tok">${escapeHtml(node.label)}</code><span class="desc">${escapeHtml(node.detail)}</span></div><ul class="tree">${branches}</ul></li>`;
    }
    const quant = node.quant
      ? `<span class="quant" title="${escapeHtml(node.quantDetail || "")}">${escapeHtml(node.quant)}</span>`
      : "";
    let kids = "";
    if (node.children && node.children.length) {
      kids = `<ul class="tree">${renderNodes(node.children)}</ul>`;
    }
    const detail = node.quant
      ? `${escapeHtml(node.detail)} <em>— ${escapeHtml(node.quantDetail)}</em>`
      : escapeHtml(node.detail);
    return `<li class="node k-${node.kind}"><div class="node-row"><code class="tok">${escapeHtml(node.label)}</code>${quant}<span class="desc">${detail}</span></div>${kids}</li>`;
  }

  /* ---------- matches / groups ---------- */
  function renderMatches(regex) {
    const text = el.test.value;
    if (!regex || el.error.classList.contains("show")) {
      el.matches.innerHTML = '<p class="empty">有効なパターンとテキストを入力してください。</p>';
      return;
    }
    const matches = collectMatches(regex, text);
    if (!matches.length) {
      el.matches.innerHTML = '<p class="empty">一致なし。</p>';
      return;
    }
    el.matches.innerHTML = matches
      .map((m, i) => {
        const cls = "c" + (i % HL_COLORS);
        let groups = "";
        for (let g = 1; g < m.length; g++) {
          const val = m[g];
          groups += `<div class="grp"><span class="grp-n">$${g}</span><span class="grp-v">${
            val === undefined ? '<i class="undef">未捕捉</i>' : escapeHtml(val)
          }</span></div>`;
        }
        if (m.groups) {
          for (const [name, val] of Object.entries(m.groups)) {
            groups += `<div class="grp named"><span class="grp-n">&lt;${escapeHtml(name)}&gt;</span><span class="grp-v">${
              val === undefined ? '<i class="undef">未捕捉</i>' : escapeHtml(val)
            }</span></div>`;
          }
        }
        return `<div class="match-card">
          <div class="match-head"><span class="dot ${cls}"></span>一致 #${i + 1}
            <span class="match-pos">位置 ${m.index}–${m.index + m[0].length}</span></div>
          <div class="match-full">${m[0].length ? escapeHtml(m[0]) : '<i class="undef">空一致</i>'}</div>
          ${groups || '<div class="no-grp">キャプチャグループなし</div>'}
        </div>`;
      })
      .join("");
  }

  /* ---------- replace ---------- */
  function renderReplace(regex) {
    if (!regex || el.error.classList.contains("show")) {
      el.replaceOut.textContent = "";
      return;
    }
    try {
      el.replaceOut.textContent = el.test.value.replace(regex, el.replaceInput.value);
    } catch (e) {
      el.replaceOut.textContent = "⚠ " + e.message;
    }
  }

  /* ---------- scroll sync ---------- */
  function syncScroll() {
    el.highlight.scrollTop = el.test.scrollTop;
    el.highlight.scrollLeft = el.test.scrollLeft;
  }

  /* ---------- presets ---------- */
  function currentPreset() {
    return PRESETS[state.preset] || PRESETS[DEFAULT_PRESET];
  }
  // Apply a preset. By default this resets flags to the preset's defaults;
  // pass {keepFlags:true} to keep current flags (used when restoring state).
  function applyPreset(name, opts = {}) {
    if (!PRESETS[name]) name = DEFAULT_PRESET;
    state.preset = name;
    const p = PRESETS[name];
    if (!opts.keepFlags) state.flags = new Set(p.flags);
    // copy/display format
    el.patternWrap.dataset.fmt = p.copy;
    el.delimLead.textContent = p.lead;
    el.delimTrail.textContent = p.trail;
    // active button
    $$(".preset-btn", el.presetSwitch).forEach((b) =>
      b.classList.toggle("active", b.dataset.preset === name)
    );
    renderFlags();
  }

  // Build the text produced by the copy/literal action for the current preset.
  function patternLiteral() {
    const p = currentPreset();
    const pat = el.pattern.value;
    if (p.copy === "bare") return pat;
    if (p.copy === "python") return 'r"' + pat + '"';
    return `/${pat}/${flagsString()}`; // literal
  }

  /* ---------- flags ---------- */
  function renderFlags() {
    const defaults = new Set(currentPreset().flags);
    $$(".flag", el.flagBar).forEach((b) => {
      b.classList.toggle("on", state.flags.has(b.dataset.flag));
      b.classList.toggle("preset-default", defaults.has(b.dataset.flag));
    });
    const p = currentPreset();
    const def = p.flags.join("") || "なし";
    el.flagTipLabel.innerHTML = `${escapeHtml(p.label)} 既定: <b>${escapeHtml(def)}</b>`;
    el.flagTip.title =
      `${p.label} プリセットの既定フラグ: ${def}\nクリックでこの既定に戻す`;
  }
  el.flagBar.addEventListener("click", (e) => {
    const b = e.target.closest(".flag");
    if (!b) return;
    const f = b.dataset.flag;
    state.flags.has(f) ? state.flags.delete(f) : state.flags.add(f);
    renderFlags();
    run();
  });
  el.flagTip.addEventListener("click", () => {
    const p = currentPreset();
    state.flags = new Set(p.flags);
    renderFlags();
    run();
    toast(`${p.label} 既定フラグ (${p.flags.join("") || "なし"}) に戻しました`);
  });
  el.presetSwitch.addEventListener("click", (e) => {
    const b = e.target.closest(".preset-btn");
    if (!b) return;
    applyPreset(b.dataset.preset);
    run();
    toast(`${currentPreset().label} プリセットに切り替えました`);
  });

  /* ---------- tabs ---------- */
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.remove("active"));
      $$(".tab-pane").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      $(`.tab-pane[data-pane="${t.dataset.tab}"]`).classList.add("active");
    })
  );
  $$(".ref-tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".ref-tab").forEach((x) => x.classList.remove("active"));
      $$(".ref-pane").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      $(`.ref-pane[data-refpane="${t.dataset.ref}"]`).classList.add("active");
    })
  );

  /* ---------- reference rendering ---------- */
  function insertAtCursor(input, text) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const pos = start + text.length;
    input.setSelectionRange(pos, pos);
    input.focus();
  }

  function renderCheat() {
    el.cheatList.innerHTML = DATA.cheat
      .map(
        (g) => `<div class="cheat-group" data-group="${escapeHtml(g.group)}">
          <h3>${escapeHtml(g.group)}</h3>
          <div class="cheat-items">${g.items
            .map(
              (it) =>
                `<button class="cheat-item" data-tok="${escapeHtml(it.tok)}" data-search="${escapeHtml(
                  (it.tok + " " + it.desc).toLowerCase()
                )}"><code>${escapeHtml(it.tok)}</code><span>${escapeHtml(it.desc)}</span></button>`
            )
            .join("")}</div></div>`
      )
      .join("");
  }
  function renderSnippets() {
    el.snippetList.innerHTML = DATA.snippets
      .map(
        (s, i) =>
          `<button class="snippet" data-i="${i}" data-search="${escapeHtml(
            (s.name + " " + s.tags + " " + s.pattern).toLowerCase()
          )}">
            <div class="snippet-top"><span class="snippet-name">${escapeHtml(s.name)}</span><span class="snippet-use">使う →</span></div>
            <code class="snippet-pat">/${escapeHtml(s.pattern)}/${escapeHtml(s.flags)}</code>
          </button>`
      )
      .join("");
  }

  el.cheatList.addEventListener("click", (e) => {
    const b = e.target.closest(".cheat-item");
    if (!b) return;
    insertAtCursor(el.pattern, b.dataset.tok);
    run();
  });
  el.snippetList.addEventListener("click", (e) => {
    const b = e.target.closest(".snippet");
    if (!b) return;
    const s = DATA.snippets[+b.dataset.i];
    el.pattern.value = s.pattern;
    state.flags = new Set(s.flags.split(""));
    if (!el.test.value.trim() || el.test.dataset.fromSnippet) {
      el.test.value = s.sample;
      el.test.dataset.fromSnippet = "1";
    }
    renderFlags();
    run();
    toast(`「${s.name}」を読み込みました`);
  });

  el.refSearch.addEventListener("input", () => {
    const q = el.refSearch.value.trim().toLowerCase();
    $$(".cheat-item").forEach((b) => {
      b.style.display = !q || b.dataset.search.includes(q) ? "" : "none";
    });
    $$(".cheat-group").forEach((g) => {
      const any = $$(".cheat-item", g).some((b) => b.style.display !== "none");
      g.style.display = any ? "" : "none";
    });
    $$(".snippet").forEach((b) => {
      b.style.display = !q || b.dataset.search.includes(q) ? "" : "none";
    });
  });

  /* ---------- theme ---------- */
  $("#theme-toggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("rx-theme", next);
  });
  (function initTheme() {
    // 既定は light。過去に選択があればそれを尊重する。
    const saved = localStorage.getItem("rx-theme");
    document.documentElement.setAttribute("data-theme", saved || "light");
  })();

  /* ---------- persistence + share ---------- */
  function snapshot() {
    return {
      p: el.pattern.value,
      f: flagsString(),
      t: el.test.value,
      r: el.replaceInput.value,
      pr: state.preset,
    };
  }
  function persist() {
    try {
      localStorage.setItem("rx-state", JSON.stringify(snapshot()));
    } catch {}
  }
  function encodeShare() {
    return "#" + btoa(unescape(encodeURIComponent(JSON.stringify(snapshot()))));
  }
  // ?preset=… で初期プリセットを指定できる（js は javascript の別名）
  function getQueryPreset() {
    try {
      let p = new URLSearchParams(location.search).get("preset");
      if (!p) return null;
      p = p.toLowerCase();
      if (p === "js") p = "javascript";
      if (p === "vsc" || p === "code") p = "vscode";
      return PRESETS[p] ? p : null;
    } catch {
      return null;
    }
  }
  function loadState() {
    let hashState = null;
    if (location.hash.length > 1) {
      try {
        hashState = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))));
      } catch {}
    }
    let saved = null;
    if (!hashState) {
      try {
        saved = JSON.parse(localStorage.getItem("rx-state"));
      } catch {}
    }
    const queryPreset = getQueryPreset();
    const s = hashState || saved;

    if (s) {
      el.pattern.value = s.p || "";
      el.test.value = s.t || "";
      el.replaceInput.value = s.r || "";
    } else {
      // friendly default demo
      el.pattern.value = "(\\d{4})-(\\d{2})-(\\d{2})";
      el.test.value = "リリース日: 2026-06-13、次回は 2026-12-31 を予定。";
      el.replaceInput.value = "$1/$2/$3";
    }

    // 共有リンク(hash)は完全なスナップショットなのでそのまま再現する。
    // それ以外では URL の ?preset= が初期プリセットを上書きできる。
    if (hashState) {
      applyPreset(hashState.pr || DEFAULT_PRESET, { keepFlags: hashState.f != null });
      if (hashState.f != null) state.flags = new Set(hashState.f.split(""));
    } else if (queryPreset) {
      applyPreset(queryPreset); // 明示指定 → そのプリセットの既定設定を適用
    } else {
      const name = (s && s.pr) || DEFAULT_PRESET;
      applyPreset(name, { keepFlags: s && s.f != null });
      if (s && s.f != null) state.flags = new Set(s.f.split(""));
    }
  }

  $("#share-btn").addEventListener("click", () => {
    const url = location.origin + location.pathname + encodeShare();
    history.replaceState(null, "", encodeShare());
    copy(url, "共有リンクをコピーしました");
  });
  $("#copy-pattern").addEventListener("click", () =>
    copy(patternLiteral(), `${currentPreset().label} 形式でコピーしました`)
  );
  $("#copy-replace").addEventListener("click", () =>
    copy(el.replaceOut.textContent, "結果をコピーしました")
  );
  $("#sample-text").addEventListener("click", () => {
    el.test.value =
      "Email: hello@example.com / support+dev@regexpresso.dev\n" +
      "日付: 2026-06-13, 2025-12-31\n" +
      "電話: 090-1234-5678  URL: https://github.com/ilolio/regexpresso\n" +
      "色: #c98a4b  IP: 192.168.0.1  時刻: 09:30:00";
    delete el.test.dataset.fromSnippet;
    run();
  });

  /* ---------- wire inputs ---------- */
  ["input"].forEach((ev) => {
    el.pattern.addEventListener(ev, run);
    el.test.addEventListener(ev, () => {
      delete el.test.dataset.fromSnippet;
      run();
    });
    el.replaceInput.addEventListener(ev, run);
  });
  el.test.addEventListener("scroll", syncScroll);

  // highlight hover -> nothing fancy, but keep markers interactive-ready
  /* ---------- boot ---------- */
  renderCheat();
  renderSnippets();
  loadState(); // applyPreset() 内で renderFlags() を呼ぶ
  run();
})();

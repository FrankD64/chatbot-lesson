/* Your First Chatbot: terminals, slide decks and the intro video.
   Python runs in the learner's own browser (Pyodide), so nothing is sent to a server
   and no account is needed. */

(function () {
  "use strict";

  /* ---------------- Python loader ---------------- */
  const PYODIDE_BASE = window.PYODIDE_BASE || "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
  let pyPromise = null;

  function loadPython() {
    if (!pyPromise) {
      pyPromise = new Promise(function (resolve, reject) {
        const s = document.createElement("script");
        s.src = PYODIDE_BASE + "pyodide.js";
        s.onload = function () {
          window.loadPyodide({ indexURL: PYODIDE_BASE }).then(resolve, reject);
        };
        s.onerror = function () { reject(new Error("blocked")); };
        document.head.appendChild(s);
      });
      pyPromise.catch(function () { pyPromise = null; }); // allow a retry
    }
    return pyPromise;
  }

  /* ---------------- Friendly error help ---------------- */
  const HELP = [
    { re: /invalid character '[“”‘’]'/, anchor: "curly",
      text: "Your code has curly quotes (“like this”). Python only understands straight quotes (\"like this\"). Delete them and type them again with the quote key on your keyboard." },
    { re: /unterminated string literal|EOL while scanning|unterminated triple-quoted/, anchor: "quote",
      text: "A quote is missing. Text needs a quote at the start and at the end, like \"hello\"." },
    { re: /was never closed|unexpected EOF/, anchor: "bracket",
      text: "A bracket is missing. Every ( needs a matching ) at the end." },
    { re: /unmatched '\)'|does not match opening parenthesis/, anchor: "bracket",
      text: "There is an extra or mismatched bracket. Count your ( and ) so they match." },
    { re: /NameError: name '(Print|PRINT|Input|INPUT)'/, anchor: "capital",
      text: "Python cares about capital letters. Write print and input with small letters." },
    { re: /NameError: name '([^']+)' is not defined/, anchor: "name",
      text: function (m) {
        return "Python doesn’t know the word “" + m[1] + "”. Check the spelling. If it’s meant to be text, put quotes around it. If it’s a variable, make sure you made it first with = .";
      } },
    { re: /can only concatenate str|unsupported operand type/, anchor: "join",
      text: "You’re using + to join text with something that isn’t text. Check each piece you’re joining." },
    { re: /IndentationError|unexpected indent/, anchor: "indent",
      text: "There’s an extra space at the start of a line. Delete the spaces before your code." },
    { re: /invalid syntax/, anchor: "syntax",
      text: "Something is out of place. Check your quotes, brackets and + signs on that line." }
  ];

  function friendlyHelp(lastLine) {
    for (const h of HELP) {
      const m = lastLine.match(h.re);
      if (m) return { text: typeof h.text === "function" ? h.text(m) : h.text, anchor: h.anchor };
    }
    return { text: "Check the line number above carefully, one character at a time.", anchor: "" };
  }

  /* ---------------- Terminals ---------------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function setupTerminal(box) {
    const code = box.querySelector("textarea");
    const starter = code.value;
    const title = box.dataset.title || "Python";
    const check = box.dataset.check || "none";

    code.classList.add("term-code");
    code.setAttribute("spellcheck", "false");
    code.setAttribute("autocapitalize", "off");
    code.setAttribute("autocomplete", "off");
    code.setAttribute("autocorrect", "off");
    code.setAttribute("aria-label", "Python code editor: " + title);
    code.rows = Math.max(4, starter.split("\n").length + 1);

    const bar = el("div", "term-bar");
    bar.appendChild(el("span", "term-title", title));
    const btns = el("div", "btn-row");
    btns.style.marginTop = "0";
    const runBtn = el("button", "btn", "▶ Run");
    runBtn.type = "button";
    const resetBtn = el("button", "btn secondary", "Reset");
    resetBtn.type = "button";
    const copyBtn = el("button", "btn secondary", "Copy code");
    copyBtn.type = "button";
    btns.append(runBtn, resetBtn, copyBtn);
    bar.appendChild(btns);

    const outLabel = el("div", "term-out-label", "Output");
    const out = el("div", "term-out");
    out.setAttribute("aria-live", "polite");
    out.setAttribute("role", "log");
    out.setAttribute("aria-label", "Output for " + title);
    const msg = el("span", "m", "Press Run to see what your code does.");
    out.appendChild(msg);
    const ask = el("div", "term-ask");
    ask.hidden = true;
    const help = el("div", "term-help");
    help.hidden = true;
    const result = el("div", "term-check");
    result.hidden = true;

    box.insertBefore(bar, code);
    box.append(outLabel, out, ask, help, result);

    let pendingReject = null;

    function write(text, cls) { out.appendChild(el("span", cls, text)); }

    function askUser(prompt, answers) {
      return new Promise(function (resolve, reject) {
        write(prompt, "o");
        ask.innerHTML = "";
        const input = el("input");
        input.type = "text";
        input.setAttribute("aria-label", "Type your answer to: " + (prompt.trim() || "the question"));
        input.setAttribute("autocomplete", "off");
        const enter = el("button", "btn", "Enter");
        enter.type = "button";
        ask.append(input, enter);
        ask.hidden = false;
        input.focus();
        function send() {
          const v = input.value;
          answers.push(v);
          write(v + "\n", "i");
          ask.hidden = true;
          pendingReject = null;
          resolve(v);
        }
        enter.addEventListener("click", send);
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } });
        pendingReject = reject;
      });
    }

    function showHelp(text, anchor) {
      help.innerHTML = "";
      // Only point to the Error Decoder; it explains the error.
      const a = el("button", "help-link", "Open it in the Error Decoder");
      a.type = "button";
      a.addEventListener("click", function () { openReference("decoder", anchor); });
      help.appendChild(a);
      help.hidden = false;
    }

    function showResult(pass, text) {
      result.textContent = (pass ? "✓ " : "") + text;
      result.className = "term-check " + (pass ? "pass" : "notyet");
      result.hidden = false;
    }

    function curlyQuoteFix() {
      help.innerHTML = "";
      help.appendChild(el("strong", null, "Curly quotes found: "));
      help.appendChild(document.createTextNode("Your code has “curly” quotes, which Python can’t read. This usually happens when code is copied from a document. "));
      const fix = el("button", "btn", "Fix them for me");
      fix.type = "button";
      fix.style.marginTop = "8px";
      fix.addEventListener("click", function () {
        code.value = code.value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        help.hidden = true;
        code.focus();
      });
      help.appendChild(fix);
      help.hidden = false;
    }

    async function run() {
      out.innerHTML = "";
      help.hidden = true;
      result.hidden = true;
      ask.hidden = true;
      const src = code.value;

      if (/[“”‘’]/.test(src)) { curlyQuoteFix(); write("Fix the quotes, then press Run again.", "m"); return; }

      runBtn.disabled = true;
      let py;
      const loading = el("span", "m", "Starting Python… (the first time can take about 10 seconds)");
      out.appendChild(loading);
      try {
        py = await loadPython();
      } catch (e) {
        out.innerHTML = "";
        write("Python couldn’t load. Check your internet connection and try again. If you’re at school, the network may be blocking it, so let your teacher know.", "e");
        runBtn.disabled = false;
        return;
      }
      out.innerHTML = "";

      const answers = [];
      let hadOutput = false;
      let printedText = "";
      py.setStdout({ batched: function (s) { hadOutput = true; printedText += s + "\n"; write(s + "\n", "o"); } });
      py.setStderr({ batched: function (s) { write(s + "\n", "e"); } });

      const ns = py.globals.get("dict")();
      ns.set("__ask", function (p) { return askUser(p, answers); });
      py.runPython("async def __ainput(prompt=''):\n    return str(await __ask(str(prompt)))", { globals: ns });
      const transformed = src.replace(/\binput\s*\(/g, "await __ainput(");

      let error = null;
      try {
        await py.runPythonAsync(transformed, { globals: ns });
      } catch (err) {
        error = err;
      } finally {
        ns.destroy();
        ask.hidden = true;
        pendingReject = null;
        runBtn.disabled = false;
      }

      if (error) {
        const textErr = String(error.message || error);
        if (/__stopped__/.test(textErr)) return; // Reset already cleared the output
        const lines = textErr.trim().split("\n").filter(Boolean);
        const last = lines[lines.length - 1] || textErr;
        const lineNums = [...textErr.matchAll(/File "<exec>", line (\d+)/g)];
        const lineNo = lineNums.length ? lineNums[lineNums.length - 1][1] : null;
        write((lineNo ? "Error on line " + lineNo + ":\n" : "Error:\n") + last + "\n", "e");
        const h = friendlyHelp(last);
        showHelp(h.text, h.anchor);
        if (check !== "none") showResult(false, "Your program has an error, fix the error, then press Run again.");
        return;
      }


      const printed = printedText;
      window.__lastAnswers = answers.slice();
      const outLines = printed.split("\n").filter(function (l) { return l.trim() !== ""; });

      if (check === "lines3") {
        if (outLines.length >= 3) showResult(true, "Good job! Your program prints " + outLines.length + " lines.");
        else showResult(false, "Your program printed " + outLines.length + " line" + (outLines.length === 1 ? "" : "s") + ". Add more print() lines to make 3 lines.");
      } else if (check === "runs") {
        if (hadOutput) showResult(true, "Good job! Your program runs with no errors.");
        else showResult(false, "Nothing printed. Make sure the print() line is still there.");
      } else if (check === "chatbot") {
        const asks = (src.match(/\binput\s*\(/g) || []).length;
        const lastPrint = outLines.length ? outLines[outLines.length - 1] : "";
        const used = answers.filter(function (a) { return a.trim() !== "" && printed.split(a).length > 1; }).length;
        if (asks < 2) showResult(false, "Your chatbot asks " + asks + " question" + (asks === 1 ? "" : "s") + ". Add a second input() line.");
        else if (answers.some(function (a) { return a.trim() === ""; })) showResult(false, "Type an answer for every question when you test it.");
        else if (used < answers.length) showResult(false, "Your reply doesn’t use every answer. Use + to add each variable to a print() line.");
        else showResult(true, "Your chatbot asks " + asks + " questions and uses every answer. Last line: “" + lastPrint + "”");
      }
    }

    runBtn.addEventListener("click", run);
    code.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
    });
    resetBtn.addEventListener("click", function () {
      if (pendingReject) { pendingReject(new Error("__stopped__")); pendingReject = null; }
      code.value = starter;
      out.innerHTML = "";
      out.appendChild(el("span", "m", "Reset to the starting code. Press Run to try it."));
      help.hidden = true;
      result.hidden = true;
      ask.hidden = true;
    });
    copyBtn.addEventListener("click", function () {
      const done = function () { copyBtn.textContent = "Copied!"; setTimeout(function () { copyBtn.textContent = "Copy code"; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(code.value).then(done, function () { code.select(); });
      else { code.select(); document.execCommand("copy"); done(); }
    });
  }

  /* ---------------- Embedded slides (Google Slides "Publish to web") ---------------- */
  function setupSlides(box) {
    let src = (box.dataset.src || "").trim();
    if (!src) return; // keep the placeholder until a published link is added
    src = src.replace(/\/pub(\?|$)/, "/embed$1").replace(/\/edit.*$/, "/embed");
    box.innerHTML = "";
    const f = document.createElement("iframe");
    f.src = src;
    f.title = box.dataset.title || "Slides";
    f.allowFullscreen = true;
    f.setAttribute("allow", "fullscreen");
    box.appendChild(f);
    const links = box.nextElementSibling;
    if (links && links.classList.contains("slides-links")) {
      let fsBtn = null;
      if (box.requestFullscreen || box.webkitRequestFullscreen) {
        // A clear Full screen button, first in the row under the slides.
        const fs = el("button", "btn slides-fs", "");
        fs.type = "button";
        fs.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg> View slides full screen';
        fs.addEventListener("click", function () {
          (box.requestFullscreen || box.webkitRequestFullscreen).call(box);
        });
        fs.title = "Press Esc to exit full screen";
        fsBtn = fs;
      }
      const a = el("a", null, "Open the slides in a new tab");
      a.href = src; a.target = "_blank"; a.rel = "noopener";
      links.insertBefore(a, links.firstChild);
      if (fsBtn) {
        const row = el("div", "slides-fs-row");
        row.appendChild(fsBtn);
        box.parentNode.insertBefore(row, links);
      }
    }
  }

  /* ---------------- Reference sidebar: Error Decoder + Key Words ---------------- */
  let refReady = Promise.resolve();
  const mobile = window.matchMedia("(max-width: 1099px)");

  function setTab(name) {
    document.querySelectorAll(".ref-tabs [role=tab]").forEach(function (t) {
      const on = t.id === "tab-" + name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    ["decoder", "words"].forEach(function (n) {
      const p = document.getElementById("ref-" + n);
      if (p) p.hidden = n !== name;
    });
  }
  function setOpen(open) {
    const panel = document.getElementById("ref-panel");
    const toggle = document.querySelector(".ref-toggle");
    const scrim = document.querySelector(".ref-scrim");
    if (!panel) return;
    panel.classList.toggle("open", open);
    if (scrim) scrim.classList.toggle("open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    if (open) { const sel = panel.querySelector("[aria-selected=true]"); if (sel) sel.focus(); }
    else if (toggle && mobile.matches) toggle.focus();
  }
  function openReference(tab, anchor) {
    refReady.then(function () {
      setTab(tab);
      if (mobile.matches) setOpen(true);
      const body = document.querySelector(".ref-body");
      const item = anchor && document.getElementById("ref-" + anchor);
      if (body && item) {
        body.scrollTop = item.offsetTop - body.offsetTop - 8;
        item.classList.add("flash");
        setTimeout(function () { item.classList.remove("flash"); }, 1800);
      }
    });
  }
  window.openReference = openReference;

  function setupReference(panel) {
    const body = panel.querySelector(".ref-body");
    refReady = fetch("assets/reference.html?v=202611271700")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        body.innerHTML = html;
        // Swap in a published Google Doc where one has been linked
        body.querySelectorAll("[data-doc-src]").forEach(function (p) {
          let src = (p.dataset.docSrc || "").trim();
          if (!src) return;
          src = src.replace(/\/(edit|pub)[^/]*$/, "/pub");
          const embed = src + (src.indexOf("?") === -1 ? "?" : "&") + "embedded=true";
          p.innerHTML = "";
          p.style.flexDirection = "column";
          const f = document.createElement("iframe");
          f.src = embed;
          f.title = (p.id === "ref-words" ? "Key Words" : "Error Decoder") + " document";
          p.appendChild(f);
          const a = el("a", "ref-open-doc", "Open this sheet in a new tab");
          a.href = src; a.target = "_blank"; a.rel = "noopener";
          p.appendChild(a);
          body.classList.add("has-doc");
        });
        setTab("decoder");
      })
      .catch(function () { body.innerHTML = "<p>This panel couldn’t load. Refresh the page to try again.</p>"; });
    panel.querySelectorAll(".ref-tabs [role=tab]").forEach(function (t) {
      t.addEventListener("click", function () { setTab(t.id.replace("tab-", "")); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const other = panel.querySelector(".ref-tabs [role=tab]:not(#" + t.id + ")");
          other.focus(); setTab(other.id.replace("tab-", ""));
        }
      });
    });
    const toggle = document.querySelector(".ref-toggle");
    if (toggle) toggle.addEventListener("click", function () { setOpen(!panel.classList.contains("open")); });
    const close = panel.querySelector(".ref-close");
    if (close) close.addEventListener("click", function () { setOpen(false); });
    const scrim = document.querySelector(".ref-scrim");
    if (scrim) scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("open")) setOpen(false); });
  }

  /* ---------------- Intro video ---------------- */
  function setupVideo(frame) {
    const id = (frame.dataset.youtubeId || "").trim();
    if (!id) return; // keep the placeholder until a video ID is added
    frame.innerHTML = "";
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?cc_load_policy=1&rel=0";
    f.title = frame.dataset.title || "Intro video";
    f.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    frame.appendChild(f);
  }


  /* ---------- Text to speech ---------- */
  const synth = window.speechSynthesis;
  let ttsToken = 0;
  let ttsStopCb = null;

  function ttsStop() {
    ttsToken++;
    if (synth) synth.cancel();
    if (ttsStopCb) { const cb = ttsStopCb; ttsStopCb = null; cb(); }
  }

  // Split long text into sentence-sized pieces (Chrome cuts off very long utterances).
  function ttsPieces(text) {
    const out = [];
    text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).forEach(function (part) {
      part = part.trim();
      while (part.length > 220) {
        let cut = part.lastIndexOf(" ", 220);
        if (cut < 60) cut = 220;
        out.push(part.slice(0, cut)); part = part.slice(cut).trim();
      }
      if (part) out.push(part);
    });
    return out;
  }

  // Speak a list of chunks in order. onDone runs when finished or stopped.
  function ttsSpeak(chunks, onDone) {
    ttsStop();
    const token = ttsToken;
    ttsStopCb = onDone;
    const pieces = [];
    chunks.forEach(function (c) { ttsPieces(c).forEach(function (p) { pieces.push(p); }); });
    let i = 0;
    function next() {
      if (token !== ttsToken) return;
      if (i >= pieces.length) { const cb = ttsStopCb; ttsStopCb = null; if (cb) cb(); return; }
      const u = new SpeechSynthesisUtterance(pieces[i++]);
      u.lang = "en-US";
      u.rate = 0.95;
      u.onend = next;
      u.onerror = next;
      synth.speak(u);
    }
    next();
  }

  const TTS_SKIP = "button, script, style, svg, .tts-btn, .slide-reader, .term-bar, .term-ask, .term-out-label, .slides-embed, .video-frame, .slides-links, [aria-hidden='true'], [data-tts-skip]";

  // Turn a section into readable chunks: one per paragraph, heading, list item or code line.
  function ttsCollect(root) {
    const chunks = [];
    let buf = "";
    function flush() { const t = buf.replace(/\s+/g, " ").trim(); if (t) chunks.push(t); buf = ""; }
    function visible(el) {
      if (el.checkVisibility) return el.checkVisibility();
      return el.offsetParent !== null || getComputedStyle(el).position === "fixed";
    }
    function walk(node) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) { buf += n.textContent; return; }
        if (n.nodeType !== 1 || n.matches(TTS_SKIP)) return;
        if (n.tagName === "DETAILS" && !n.open) { flush(); const sm = n.querySelector("summary"); if (sm) chunks.push(sm.textContent.trim()); return; }
        if (!visible(n)) return;
        if (n.tagName === "TEXTAREA" || n.tagName === "INPUT") {
          flush();
          const label = n.classList.contains("term-code") ? "The code says: " : "";
          const lines = n.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
          if (lines.length) { chunks.push(label + lines[0]); lines.slice(1).forEach(function (l) { chunks.push(l); }); }
          else if (n.classList.contains("reflect")) chunks.push("Empty answer box.");
          return;
        }
        if (n.classList.contains("term-out")) {
          flush();
          const t = n.innerText.trim();
          if (t) { chunks.push("Output:"); t.split("\n").forEach(function (l) { if (l.trim()) chunks.push(l.trim()); }); }
          return;
        }
        const block = getComputedStyle(n).display.indexOf("inline") !== 0;
        if (block) flush();
        walk(n);
        if (block) flush();
      });
    }
    walk(root);
    flush();
    return chunks;
  }

  function ttsButton(target, label) {
    const btn = el("button", "tts-btn", "");
    btn.type = "button";
    const name = label || "this section";
    function idle() {
      btn.innerHTML = '<span aria-hidden="true">🔊</span> Listen';
      btn.setAttribute("aria-label", "Read " + name + " aloud");
      btn.setAttribute("aria-pressed", "false");
      target.classList.remove("tts-reading");
    }
    idle();
    btn.addEventListener("click", function () {
      if (btn.getAttribute("aria-pressed") === "true") { ttsStop(); return; }
      const chunks = ttsCollect(target);
      ttsSpeak(chunks, idle);
      btn.innerHTML = '<span aria-hidden="true">■</span> Stop';
      btn.setAttribute("aria-label", "Stop reading " + name);
      btn.setAttribute("aria-pressed", "true");
      target.classList.add("tts-reading");
    });
    return btn;
  }

  function setupTts() {
    if (!synth || !window.SpeechSynthesisUtterance) return;
    // Each big section gets a Listen button in its top-right corner.
    document.querySelectorAll("main section.card, main section.intro, main .home-hero > .inner, main .band > .inner, main .lesson-card .content").forEach(function (sec) {
      const h = sec.querySelector("h1, h2");
      sec.insertBefore(ttsButton(sec, h ? h.textContent.trim() : ""), sec.firstChild);
    });
    document.querySelectorAll(".slide-script").forEach(setupSlideReader);
    window.addEventListener("pagehide", ttsStop);
  }

  // Read the slides aloud one at a time, using the slide text list under the deck.
  function setupSlideReader(list) {
    const slides = Array.prototype.map.call(list.querySelectorAll("li"), function (li) { return li.textContent.trim(); });
    if (!slides.length) return;
    let cur = 0, playing = false;
    const bar = el("div", "slide-reader");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Read the slides aloud");
    const title = el("span", "slide-reader-title", "Listen to the slides:");
    const prev = el("button", "btn secondary", "◀ Previous");
    const play = el("button", "btn", "");
    const next = el("button", "btn secondary", "Next ▶");
    const status = el("span", "slide-reader-status", "");
    status.setAttribute("aria-live", "polite");
    [prev, play, next].forEach(function (b) { b.type = "button"; });
    function render() {
      play.innerHTML = playing ? '<span aria-hidden="true">■</span> Stop' : '<span aria-hidden="true">🔊</span> Read slide ' + (cur + 1);
      status.textContent = "Slide " + (cur + 1) + " of " + slides.length;
      prev.disabled = cur === 0;
      next.disabled = cur === slides.length - 1;
    }
    function speak() {
      playing = true; render();
      ttsSpeak(["Slide " + (cur + 1) + ".", slides[cur]], function () { playing = false; render(); });
    }
    play.addEventListener("click", function () { if (playing) ttsStop(); else speak(); });
    prev.addEventListener("click", function () { if (cur > 0) { cur--; speak(); } });
    next.addEventListener("click", function () { if (cur < slides.length - 1) { cur++; speak(); } });
    bar.append(title, prev, play, next, status);
    const box = list.closest(".slide-script-box") || list;
    // Sit right under the Full screen button, above the new-tab and download links.
    const links = box.parentNode.querySelector(".slides-links");
    box.parentNode.insertBefore(bar, links || box);
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".terminal").forEach(setupTerminal);
    document.querySelectorAll(".slides-embed").forEach(setupSlides);
    const ref = document.getElementById("ref-panel");
    if (ref) setupReference(ref);
    document.querySelectorAll(".video-frame").forEach(setupVideo);
    setupTts();
    // Start loading Python in the background on lesson pages, so Run is quick.
    if (document.querySelector(".terminal")) setTimeout(function () { loadPython().catch(function () {}); }, 800);
  });
})();

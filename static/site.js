/* Marketing site behaviour: FAQ accordion and the book-a-demo form.
   In a file rather than inline, for the same CSP reason as site.css. */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const btn = item.querySelector('.faq-q');
    const ans = item.querySelector('.faq-a');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !isOpen);
      ans.style.maxHeight = !isOpen ? ans.scrollHeight + 'px' : null;
    });
  });

/* Book-a-demo: posts to the live agency's prospect pipeline. */
(function () {
  "use strict";
  var form = document.getElementById("book-form");
  if (!form) { return; }
  var status = document.getElementById("book-status");
  var button = form.querySelector("button[type=submit]");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (button.disabled) { return; }

    var payload = {};
    new FormData(form).forEach(function (value, key) { payload[key] = value; });

    button.disabled = true;
    button.textContent = "SENDING…";
    status.textContent = "";
    status.className = "book-status";

    fetch("/api/public/book-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().then(function (data) {
        return { ok: response.ok, data: data };
      });
    }).then(function (result) {
      if (result.ok) {
        form.querySelectorAll(".book-grid, .book-wide, .book-note")
            .forEach(function (el) { el.style.display = "none"; });
        button.style.display = "none";
        status.className = "book-status ok";
        status.textContent = result.data.message;
      } else {
        status.className = "book-status err";
        status.textContent = result.data.error || "Something went wrong.";
        button.disabled = false;
        button.textContent = "BOOK MY DEMO";
      }
    }).catch(function () {
      status.className = "book-status err";
      status.textContent = "Could not reach the server. Please email us instead.";
      button.disabled = false;
      button.textContent = "BOOK MY DEMO";
    });
  });
})();

/* ROI calculator.
   Pure arithmetic on what the visitor typed. It reads no customer data and
   asserts no improvement of its own — the lift is the visitor's own input,
   which is what keeps this an estimate rather than a claim. */
(function () {
  "use strict";
  var leads = document.getElementById("roi-leads");
  if (!leads) { return; }
  var value = document.getElementById("roi-value");
  var conv = document.getElementById("roi-conv");
  var lift = document.getElementById("roi-lift");
  var outNow = document.getElementById("roi-now");
  var outThen = document.getElementById("roi-then");
  var outExtra = document.getElementById("roi-extra");
  var outRev = document.getElementById("roi-rev");
  var outYear = document.getElementById("roi-year");

  function bounded(input, min, max, fallback) {
    var n = parseFloat(input.value);
    if (!isFinite(n) || n < min) { n = (input.value === "" ? fallback : min); }
    if (n > max) { n = max; }
    return n;
  }

  function money(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  function people(n) {
    /* Customers are whole people. Show one decimal below 10 so a small
       business does not see a real gain rounded away to zero. */
    var r = Math.round(n * 10) / 10;
    return (r < 10 && r % 1 !== 0) ? r.toFixed(1) : Math.round(r).toLocaleString("en-US");
  }

  function recalc() {
    var l = bounded(leads, 0, 100000, 0);
    var v = bounded(value, 0, 1000000, 0);
    var c = bounded(conv, 0, 100, 0) / 100;
    var up = bounded(lift, 0, 200, 0) / 100;

    var improved = Math.min(c * (1 + up), 1);   /* cannot exceed every lead */
    var now = l * c;
    var then = l * improved;
    var extra = Math.max(then - now, 0);

    outNow.textContent = people(now);
    outThen.textContent = people(then);
    outExtra.textContent = people(extra);
    outRev.textContent = money(extra * v);
    outYear.textContent = money(extra * v * 12);
  }

  [leads, value, conv, lift].forEach(function (input) {
    input.addEventListener("input", recalc);
    input.addEventListener("change", recalc);
  });
  recalc();
})();

/* Public sales assistant.
   Text only ever reaches the page through textContent, never innerHTML — the
   one link it can render is built as an element with a fixed href. */
(function () {
  "use strict";
  var root = document.getElementById("sa");
  if (!root) { return; }
  var launch = document.getElementById("sa-launch");
  var panel = document.getElementById("sa-panel");
  var close = document.getElementById("sa-close");
  var log = document.getElementById("sa-log");
  var form = document.getElementById("sa-form");
  var input = document.getElementById("sa-input");
  var send = form.querySelector(".sa-send");
  var token = null;
  var starting = false;

  function bubble(text, cls) {
    var el = document.createElement("div");
    el.className = "sa-msg " + cls;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function typing() {
    var el = document.createElement("div");
    el.className = "sa-typing";
    el.textContent = "…";
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function demoLink() {
    var a = document.createElement("a");
    a.className = "sa-cta";
    a.href = "/demo";
    a.textContent = "Open the live demo";
    log.appendChild(a);
    log.scrollTop = log.scrollHeight;
  }

  function post(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      return response.json().then(function (data) {
        return { ok: response.ok, data: data };
      });
    });
  }

  function begin() {
    if (token || starting) { return; }
    starting = true;
    post("/api/public/sales-chat/start").then(function (result) {
      starting = false;
      if (!result.ok) {
        bubble(result.data.error || "The assistant is unavailable.", "err");
        return;
      }
      token = result.data.token;
      var note = document.getElementById("sa-disclosure");
      if (result.data.disclosure) { note.textContent = result.data.disclosure; }
      (result.data.messages || []).forEach(function (m) { bubble(m.body, "bot"); });
    }).catch(function () {
      starting = false;
      bubble("Could not reach the assistant. The booking form below still works.",
             "err");
    });
  }

  function open() {
    panel.hidden = false;
    launch.setAttribute("aria-expanded", "true");
    launch.hidden = true;
    begin();
    input.focus();
  }

  function shut() {
    panel.hidden = true;
    launch.hidden = false;
    launch.setAttribute("aria-expanded", "false");
  }

  launch.addEventListener("click", open);
  close.addEventListener("click", shut);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) { shut(); }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var text = (input.value || "").trim();
    if (!text || send.disabled) { return; }
    if (!token) { begin(); return; }

    bubble(text, "me");
    input.value = "";
    send.disabled = true;
    var wait = typing();

    var payload = { token: token, message: text };
    var honeypot = form.querySelector("[name=company_fax]");
    if (honeypot && honeypot.value) { payload.company_fax = honeypot.value; }

    post("/api/public/sales-chat", payload).then(function (result) {
      wait.remove();
      send.disabled = false;
      if (!result.ok) {
        bubble(result.data.error || "Something went wrong.", "err");
        if (result.data.error && /expired/i.test(result.data.error)) { token = null; }
        return;
      }
      bubble(result.data.message, "bot");
      if (result.data.cta === "/demo") { demoLink(); }
      input.focus();
    }).catch(function () {
      wait.remove();
      send.disabled = false;
      bubble("Could not reach the assistant. Please use the booking form below.",
             "err");
    });
  });
})();

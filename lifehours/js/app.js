/* app.js — screens and buttons. Maths lives in calc.js; this file only displays. */
(function () {
  const { calc, storage, categories } = LH;
  const app = document.getElementById('app');
  let state = storage.load();
  let currentScreen = null;
  let pendingPayment = null;

  // TESTING: ratings come due 2 minutes after logging. Set to null for real delays.
  categories.settings.testDelayMinutes = 2;

  // Onboarding answers, kept until the profile is saved
  const draft = {
    mode: null,
    takeHomeHourly: null,
    weeklyBudget: null,
    sleepHoursPerNight: 8,
    lectureHoursPerWeek: 20,
    workHoursPerWeek: 0,
    basicsHoursPerDay: 2,      // cooking, eating, getting ready, getting around
    otherHoursPerWeek: 14,     // = basicsHoursPerDay × 7, used by calc.js
  };

  // The reveal example: a typical night out
  const EXAMPLE = { label: 'a £20 night out', price: 20, hours: 4 };

  // ---------- Helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmtHours(h) {
    if (h === 0) return '0h';
    if (h < 1) return Math.round(h * 60) + ' min';
    const r = Math.round(h * 10) / 10;
    return (Number.isInteger(r) ? r : r.toFixed(1)) + 'h';
  }

  function render(html) {
    app.innerHTML = html;
    const first = app.querySelector('[autofocus]');
    if (first) first.focus({ preventScroll: true });
  }

  function steps(current, total = 4) {
    return '<div class="steps" aria-label="Step ' + current + ' of ' + total + '">' +
      Array.from({ length: total }, (_, i) => '<span class="' + (i + 1 === current ? 'on' : '') + '"></span>').join('') +
      '</div>';
  }

  // dots: total free hours; filled = hours spent; regret = how many of those were regretted
  // fresh: index from which spent dots are new, so they fill in one by one
  // Dots in order: worth it (green), regretted (red), waiting for a rating (grey), still yours (outline)
  function dotsHtml(total, { worth = 0, regret = 0, pending = 0, preview = 0, reveal = false, fresh = null } = {}) {
    const a = worth, b = a + regret, c = b + pending;
    let html = '';
    for (let i = 0; i < total; i++) {
      let cls = 'dot';
      if (i < a) cls += ' worth';
      else if (i < b) cls += ' regret';
      else if (i < c) cls += ' pending';
      else if (i < c + preview) cls += ' preview';
      if (fresh != null && i >= fresh && i < c) cls += ' fresh';
      html += '<span class="' + cls + '" style="--i:' + i + ';--j:' + (fresh != null ? i - fresh : 0) + '"></span>';
    }
    const label = total + ' free hours: ' + worth + ' worth it, ' + regret + ' regretted, ' + pending + ' not rated yet';
    return '<div class="dots' + (reveal ? ' reveal' : '') + '" role="img" aria-label="' + label + '">' + html + '</div>';
  }

  // This week's hours split by rating, rounded to whole dots and capped at the free week
  function weekDots(free) {
    const week = calc.logsThisWeek(state.logs, new Date());
    const hrs = pred => week.filter(pred).reduce((s, l) => s + l.lifeHours, 0);
    let left = free;
    const take = h => { const n = Math.min(left, Math.round(h)); left -= n; return n; };
    const worth = take(hrs(l => typeof l.rating === 'number' && !calc.isRegret(l)));
    const regret = take(hrs(calc.isRegret));
    const pending = take(hrs(l => typeof l.rating !== 'number'));
    return { worth, regret, pending, total: worth + regret + pending };
  }

  // ---------- Onboarding ----------
  function screenHook() {
    render(`
      <section class="screen">
        <div class="screen-body" style="display:flex;flex-direction:column;justify-content:center">
          <p class="wordmark">Life-hours</p>
          <h1>What did your last night out really cost you?</h1>
          <p class="lede">Not just the money. The hours you worked to pay for it, and the hours you spent doing it.</p>
        </div>
        <div class="screen-foot">
          <button class="btn btn-primary" id="go" autofocus>Find out</button>
        </div>
      </section>`);
    app.querySelector('#go').onclick = screenFunding;
  }

  function screenFunding() {
    render(`
      <section class="screen">
        ${steps(1)}
        <div class="screen-body">
          <h1>Where does your spending money come from?</h1>
          <p class="lede">This decides how we turn pounds into hours.</p>
          <div class="choices">
            <button class="choice" data-mode="job" aria-pressed="${draft.mode === 'job'}">
              <strong>Mostly a job</strong>
              <span>We'll use your hourly wage, even if you also get a loan.</span>
            </button>
            <button class="choice" data-mode="loan" aria-pressed="${draft.mode === 'loan'}">
              <strong>Mostly my student loan</strong>
              <span>We'll use what you have to live on each week.</span>
            </button>
          </div>
        </div>
      </section>`);
    app.querySelectorAll('.choice').forEach(b => {
      b.onclick = () => {
        draft.mode = b.dataset.mode;
        if (draft.mode === 'job' && !draft.workHoursPerWeek) draft.workHoursPerWeek = 10;
        if (draft.mode === 'loan') draft.workHoursPerWeek = 0;
        app.querySelectorAll('.choice').forEach(c => c.setAttribute('aria-pressed', c === b));
        setTimeout(screenRate, 220); // let the selection register before moving on
      };
    });
  }

  function screenRate() {
    const job = draft.mode === 'job';
    const value = job ? draft.takeHomeHourly : draft.weeklyBudget;
    render(`
      <section class="screen">
        ${steps(2)}
        <div class="screen-body">
          <h1>${job ? 'What do you take home per hour?' : 'How much do you have to live on each week?'}</h1>
          <p class="lede">${job
            ? 'After tax. You can find it on your payslip.'
            : 'What’s left of your loan after rent, divided by the weeks it has to last.'}</p>
          <label class="money">
            <span class="sym">£</span>
            <input id="amt" type="text" inputmode="decimal" autocomplete="off" placeholder="0"
              value="${value != null ? value : ''}" aria-label="${job ? 'Take-home pay per hour' : 'Weekly budget'}" autofocus>
            <span class="unit">${job ? 'an hour' : 'a week'}</span>
          </label>
          <p class="error" id="err" role="alert"></p>
        </div>
        <div class="screen-foot">
          <button class="btn btn-primary" id="next" disabled>Continue</button>
          <button class="btn btn-quiet" id="back">Back</button>
        </div>
      </section>`);
    const input = app.querySelector('#amt');
    const next = app.querySelector('#next');
    const parse = () => parseFloat(input.value.replace(/[£,\s]/g, ''));
    const check = () => { next.disabled = !(parse() > 0); app.querySelector('#err').textContent = ''; };
    input.oninput = check;
    check();
    input.onkeydown = e => { if (e.key === 'Enter' && !next.disabled) next.click(); };
    next.onclick = () => {
      const v = parse();
      if (job && v > 200) { app.querySelector('#err').textContent = 'That’s per hour, not per month. Enter your hourly rate.'; return; }
      if (job) draft.takeHomeHourly = v; else draft.weeklyBudget = v;
      screenWeek();
    };
    app.querySelector('#back').onclick = screenFunding;
  }

  function screenWeek() {
    const rows = [
      { key: 'sleepHoursPerNight', label: 'Sleep', sub: 'hours a night', step: 0.5, min: 4, max: 12 },
      { key: 'lectureHoursPerWeek', label: 'Lectures and study', sub: 'hours a week', step: 1, min: 0, max: 80 },
      { key: 'workHoursPerWeek', label: 'Paid work', sub: 'hours a week', step: 1, min: 0, max: 60 },
      { key: 'basicsHoursPerDay', label: 'Daily basics', sub: 'cooking, eating, getting ready, travel — hours a day', step: 0.5, min: 0, max: 8 },
    ];
    render(`
      <section class="screen">
        ${steps(3)}
        <div class="screen-body">
          <h1>Now let’s find your free time.</h1>
          <p class="lede">Rough numbers are fine. You can change them later.</p>
          <div class="stepper-list">
            ${rows.map(r => `
              <div class="stepper">
                <label id="l-${r.key}">${r.label}<small>${r.sub}</small></label>
                <div class="stepper-ctrl" role="group" aria-labelledby="l-${r.key}">
                  <button data-key="${r.key}" data-d="-1" aria-label="Less">−</button>
                  <output id="o-${r.key}">${draft[r.key]}</output>
                  <button data-key="${r.key}" data-d="1" aria-label="More">+</button>
                </div>
              </div>`).join('')}
          </div>
          <div class="live-total">
            <span class="muted">Free hours a week</span>
            <span class="n" id="free"></span>
          </div>
          <p class="error" id="err" role="alert"></p>
        </div>
        <div class="screen-foot">
          <button class="btn btn-primary" id="next">Show me my week</button>
          <button class="btn btn-quiet" id="back">Back</button>
        </div>
      </section>`);
    const update = () => {
      const free = calc.freeHoursPerWeek(draft);
      app.querySelector('#free').textContent = Math.round(free);
      app.querySelector('#next').disabled = free < 1;
      app.querySelector('#err').textContent = free < 1 ? 'That leaves no free time. Lower one of the numbers.' : '';
    };
    app.querySelectorAll('.stepper-ctrl button').forEach(b => {
      b.onclick = () => {
        const r = rows.find(x => x.key === b.dataset.key);
        const v = Math.min(r.max, Math.max(r.min, draft[r.key] + r.step * Number(b.dataset.d)));
        draft[r.key] = v;
        draft.otherHoursPerWeek = draft.basicsHoursPerDay * 7;
        app.querySelector('#o-' + r.key).textContent = v;
        update();
      };
    });
    update();
    app.querySelector('#next').onclick = screenReveal;
    app.querySelector('#back').onclick = screenRate;
  }

  function screenReveal() {
    const free = Math.round(calc.freeHoursPerWeek(draft));
    const rate = calc.hourlyRate(draft);
    const b = calc.lifeHoursBreakdown(EXAMPLE.price, EXAMPLE.hours, rate);
    const exampleDots = Math.min(free, Math.round(b.total));
    const pct = Math.round(100 * b.total / free);
    const payingLabel = draft.mode === 'job' ? 'working to pay' : 'of your money';
    render(`
      <section class="screen">
        ${steps(4)}
        <div class="screen-body">
          <p class="muted" style="margin:0">This is your week.</p>
          <div class="big-number">${free}<small>free hours</small></div>
          ${dotsHtml(free, { preview: exampleDots, reveal: true })}
          <div class="fade-late" style="--delay:${Math.min(free * 18, 900) + 400}ms">
            <p style="margin:0 0 10px">Every hour you spend is one of these. So is every pound, ${draft.mode === 'job' ? 'because it took time to earn' : 'because your money is what pays for this free time'}. Take ${EXAMPLE.label}:</p>
            <div class="equation" aria-label="${fmtHours(b.doing)} doing it plus ${fmtHours(b.paying)} ${payingLabel} equals ${fmtHours(b.total)}">
              <div class="part"><div class="n">${fmtHours(b.doing)}</div><div class="l">doing it</div></div>
              <div class="op">+</div>
              <div class="part"><div class="n">${fmtHours(b.paying)}</div><div class="l">${payingLabel}</div></div>
              <div class="op">=</div>
              <div class="part"><div class="n">${fmtHours(b.total)}</div><div class="l">life-hours</div></div>
            </div>
            <p class="fine">${pct >= 100 ? 'That’s more than your whole free week.' : 'That’s ' + pct + '% of your free week — the dots breathing above.'}</p>
          </div>
        </div>
        <div class="screen-foot fade-late" style="--delay:${Math.min(free * 18, 900) + 900}ms">
          <button class="btn btn-primary" id="start">Start tracking</button>
          <button class="btn btn-quiet" id="back">Change my numbers</button>
        </div>
      </section>`);
    app.querySelector('#start').onclick = () => {
      state.profile = { ...draft, createdAt: new Date().toISOString() };
      storage.save(state);
      if (pendingPayment) { const p = pendingPayment; pendingPayment = null; return screenLog(p); }
      screenHome();
    };
    app.querySelector('#back').onclick = screenWeek;
  }

  // ---------- Home ----------
  function screenHome({ freshFrom = null, toast = '' } = {}) {
    // Rating gate: anything due gets rated before you see home or log something new
    if (calc.ratingsDue(state.logs, new Date()).length) return screenRating();
    currentScreen = 'home';
    const p = state.profile;
    const now = new Date();
    const free = Math.round(calc.freeHoursPerWeek(p));
    const week = calc.logsThisWeek(state.logs, now)
      .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
    const used = calc.hoursUsedThisWeek(state.logs, now);
    const ledger = calc.regretLedger(state.logs);
    const left = Math.max(0, free - used);
    const over = used - free;
    render(`
      <section class="screen">
        <header class="home-head">
          <span class="wordmark">Life-hours</span>
          <span class="fine">This week</span>
        </header>
        <div class="screen-body">
          <div class="big-number">${Math.round(left)}<small>of ${free} free hours left</small></div>
          ${over > 0.5 ? `<p class="fine" style="margin:6px 0 0">You’re ${fmtHours(over)} past your free week.</p>` : ''}
          ${dotsHtml(free, { ...weekDots(free), fresh: freshFrom })}
          <div class="legend">
            <span><i class="dot worth"></i>Worth it</span>
            <span><i class="dot regret"></i>Regretted</span>
            <span><i class="dot pending"></i>Unrated</span>
            <span><i class="dot"></i>Still yours</span>
          </div>
          <div class="ledger">
            <span>
              Hours you’ve regretted
              <span class="fine" style="display:block">${ledger.count
                ? 'Since you started. This never resets.'
                : 'Nothing yet. Rate what you log and this fills in.'}</span>
            </span>
            <span class="n">${fmtHours(ledger.hours)}</span>
          </div>
          ${week.length ? `
            <ul class="log-list" aria-label="This week">
              ${week.map(l => `
                <li>
                  <span>
                    ${esc(l.activity)}
                    <span class="fine" style="display:block">${categories.BY_ID[l.category].label}${l.price ? ', £' + l.price.toFixed(2) : ''}</span>
                  </span>
                  <span class="log-hours">
                    ${fmtHours(l.lifeHours)}
                    <span class="fine" style="display:block">${typeof l.rating === 'number' ? 'Rated ' + l.rating + '/10' : 'Rate ' + whenText(l.ratingDueAt)}</span>
                  </span>
                </li>`).join('')}
            </ul>` : ''}
        </div>
        <div class="screen-foot">
          <button class="btn btn-primary" id="log">Log something</button>
          <button class="btn btn-quiet" id="auto">${state.autoLogConnected ? 'Card payments: connected' : 'Log card payments automatically'}</button>
          <button class="btn btn-quiet" id="reset">Start over</button>
          ${categories.settings.testDelayMinutes ? `<p class="fine" style="text-align:center;margin:0">Test mode: ratings are due ${categories.settings.testDelayMinutes} min after logging.</p>` : ''}
        </div>
        ${toast ? `<div class="toast" role="status">${esc(toast)}</div>` : ''}
      </section>`);
    app.querySelector('#log').onclick = () => screenLog();
    app.querySelector('#auto').onclick = screenAutoSetup;
    app.querySelector('#reset').onclick = () => { state = storage.reset(); screenHook(); };
  }

  // "11:00 tomorrow", "at 18:30", "on Thursday"
  function whenText(date) {
    const d = new Date(date), now = new Date();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 864e5);
    if (days <= 0) return 'at ' + time;
    if (days === 1) return 'at ' + time + ' tomorrow';
    return 'on ' + d.toLocaleDateString('en-GB', { weekday: 'long' });
  }

  // ---------- Log something ----------
  // prefill: { activity, price, source: 'applepay', key } when opened from a card payment
  function screenLog(prefill = null) {
    // A just-made payment is logged first; due ratings wait until after, so the auto-log isn't blocked
    if (!prefill && calc.ratingsDue(state.logs, new Date()).length) return screenRating();
    currentScreen = 'log';
    const p = state.profile;
    const rate = calc.hourlyRate(p);
    const free = Math.round(calc.freeHoursPerWeek(p));
    const log = { activity: '', category: null, autoCategory: null, matched: null, essential: false,
      price: 0, durationHours: 1, durationTouched: false, countAnyway: false };

    render(`
      <section class="screen">
        <header class="home-head">
          <button class="btn btn-quiet" id="back" style="padding:0">${prefill ? 'Don’t log it' : 'Cancel'}</button>
          ${prefill ? '<span class="pill">Just paid with Apple Pay</span>' : ''}
        </header>
        <div class="screen-body">
          <h1 style="font-size:28px">${prefill ? 'Here’s what that really cost.' : 'What did you do?'}</h1>
          <input id="what" class="text-field" type="text" autocomplete="off" maxlength="60"
            placeholder="Spoons with flatmates" aria-label="What did you do?" ${prefill ? '' : 'autofocus'}>
          <div id="cat-area" class="cat-area"></div>

          <div id="details" class="details" hidden>
            <div class="field-row">
              <label for="price">Cost</label>
              <label class="money money-sm">
                <span class="sym">£</span>
                <input id="price" type="text" inputmode="decimal" autocomplete="off" placeholder="0">
              </label>
            </div>
            <div class="field-row">
              <span id="dur-label">Time it took</span>
              <div class="stepper-ctrl" role="group" aria-labelledby="dur-label">
                <button id="dur-minus" aria-label="Less time">−</button>
                <output id="dur"></output>
                <button id="dur-plus" aria-label="More time">+</button>
              </div>
            </div>
            <div class="cost-preview" aria-live="polite">
              <div class="big-number" style="font-size:56px"><span id="lh">0</span><small>life-hours</small></div>
              <p class="fine" id="lh-detail"></p>
            </div>
          </div>
        </div>
        <div class="screen-foot">
          <button class="btn btn-primary" id="save" disabled>Log it</button>
        </div>
      </section>`);

    const $ = s => app.querySelector(s);
    const what = $('#what'), catArea = $('#cat-area'), details = $('#details');
    const DURATION_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12];

    // Category: what the user corrected before beats the keyword rule
    function autoCategorise(text) {
      const key = text.trim().toLowerCase();
      const learned = state.overrides && state.overrides[key];
      if (learned) return { category: learned, essential: false, matched: null, learned: true };
      return categories.categorise(text);
    }

    function drawCategories() {
      if (!log.activity.trim()) { catArea.innerHTML = ''; return; }
      if (log.essential && !log.countAnyway) {
        catArea.innerHTML = `
          <div class="essential-note">
            <p style="margin:0">This looks like an essential${log.matched ? ' (' + esc(log.matched) + ')' : ''}. Life-hours only counts choices, so it won’t use up your dots.</p>
            <button class="btn btn-quiet" id="anyway" style="padding:8px 0">Count it anyway</button>
          </div>`;
        $('#anyway').onclick = () => { log.countAnyway = true; log.category = 'other'; refresh(); };
        return;
      }
      catArea.innerHTML = `
        <p class="fine" style="margin:0 0 8px">${log.category === log.autoCategory ? 'Sorted for you. Tap to change.' : 'Changed by you.'}</p>
        <div class="chips" role="radiogroup" aria-label="Category">
          ${categories.CATEGORIES.map(c => `
            <button class="chip" role="radio" aria-checked="${c.id === log.category}" data-cat="${c.id}">${c.label}</button>`).join('')}
        </div>`;
      catArea.querySelectorAll('.chip').forEach(b => {
        b.onclick = () => {
          log.category = b.dataset.cat;
          if (!log.durationTouched) log.durationHours = categories.BY_ID[log.category].defaultHours;
          refresh();
        };
      });
    }

    let shown = 0;
    function animateNumber(target) {
      const el = $('#lh');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const from = shown, start = performance.now(), dur = 350;
      shown = target;
      if (reduce) { el.textContent = fmtNum(target); return; }
      (function tick(t) {
        const k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmtNum(from + (target - from) * e);
        if (k < 1) requestAnimationFrame(tick);
      })(start);
    }
    const fmtNum = n => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");

    function refresh() {
      const hasText = log.activity.trim().length > 0;
      const tracked = hasText && (!log.essential || log.countAnyway);
      drawCategories();
      details.hidden = !tracked;
      $('#save').disabled = !tracked;
      if (!tracked) return;
      $('#dur').textContent = fmtHours(log.durationHours);
      const b = calc.lifeHoursBreakdown(log.price, log.durationHours, rate);
      animateNumber(b.total);
      const pct = Math.round(100 * b.total / free);
      $('#lh-detail').textContent = (log.price > 0
        ? fmtHours(b.doing) + ' doing it + ' + fmtHours(b.paying) + (p.mode === 'job' ? ' working to pay for it. ' : ' of your money. ')
        : 'All of it is time. ') + (pct >= 100 ? 'More than your whole free week.' : pct + '% of your free week.');
    }

    function applyCategory() {
      const r = autoCategorise(log.activity);
      log.essential = r.essential;
      log.matched = r.matched;
      log.countAnyway = false;
      log.autoCategory = r.category;
      log.category = r.category;
      if (!log.durationTouched && r.category) log.durationHours = categories.BY_ID[r.category].defaultHours;
      refresh();
    }

    let typing;
    what.oninput = () => {
      log.activity = what.value;
      clearTimeout(typing);
      typing = setTimeout(applyCategory, 250);   // wait until they pause typing, so the chip doesn't flicker
    };
    what.onkeydown = e => { if (e.key === 'Enter') $('#price').focus(); };

    $('#price').oninput = e => {
      const v = parseFloat(e.target.value.replace(/[£,\s]/g, ''));
      log.price = v > 0 ? v : 0;
      refresh();
    };
    const stepDuration = d => {
      const i = DURATION_STEPS.findIndex(s => s >= log.durationHours);
      const next = DURATION_STEPS[Math.min(DURATION_STEPS.length - 1, Math.max(0, (i < 0 ? DURATION_STEPS.length - 1 : i) + d))];
      log.durationHours = next;
      log.durationTouched = true;
      refresh();
    };
    $('#dur-minus').onclick = () => stepDuration(-1);
    $('#dur-plus').onclick = () => stepDuration(1);
    $('#back').onclick = () => screenHome();

    if (prefill) {
      what.value = log.activity = prefill.activity;
      log.price = prefill.price;
      $('#price').value = prefill.price ? prefill.price.toFixed(2) : '';
      applyCategory();
    }

    $('#save').onclick = () => {
      const now = new Date();
      const before = weekDots(free).total;
      const entry = {
        id: now.getTime().toString(36),
        activity: log.activity.trim(),
        category: log.category,
        autoCategory: log.autoCategory,   // kept so we can measure how often the auto-sort was right
        price: log.price,
        durationHours: log.durationHours,
        lifeHours: calc.lifeHours(log.price, log.durationHours, rate),
        loggedAt: now.toISOString(),
        ratingDueAt: categories.ratingDueAt(log.category, now).toISOString(),
        rating: null,
        source: prefill ? prefill.source : 'manual',
      };
      state.logs.push(entry);
      if (prefill && !prefill.demo) state.autoLogConnected = true;
      if (prefill && prefill.key) {
        state.handledPayments = (state.handledPayments || []).concat(prefill.key).slice(-50);
      }
      // Learn from corrections: next time this exact activity goes straight to their category
      if (entry.autoCategory !== entry.category) {
        state.overrides = state.overrides || {};
        state.overrides[entry.activity.toLowerCase()] = entry.category;
      }
      storage.save(state);
      screenHome({ freshFrom: before, toast: 'Logged. We’ll ask how it was ' + whenText(entry.ratingDueAt) + '.' });
    };
  }

  // ---------- Rating gate ----------
  let gateTotal = 0; // how many were due when the gate opened, for "1 of 3"

  function screenRating() {
    currentScreen = 'rating';
    const due = calc.ratingsDue(state.logs, new Date())
      .sort((a, b) => new Date(a.ratingDueAt) - new Date(b.ratingDueAt));
    if (!due.length) { gateTotal = 0; return screenHome(); }
    gateTotal = Math.max(gateTotal, due.length);
    const log = due[0];
    const position = gateTotal - due.length + 1;
    const loggedTime = new Date(log.loggedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    render(`
      <section class="screen">
        <header class="home-head">
          <span class="fine">Before you carry on</span>
          <span class="fine">${gateTotal > 1 ? position + ' of ' + gateTotal : ''}</span>
        </header>
        <div class="screen-body" id="rate-body">
          <h1>How was ${esc(log.activity)}?</h1>
          <p class="lede">You logged it at ${loggedTime}. It cost ${fmtHours(log.lifeHours)} of your life${log.price ? ', including £' + log.price.toFixed(2) : ''}.</p>
          <div class="rating" role="radiogroup" aria-label="Rate it from 1 to 10">
            ${Array.from({ length: 10 }, (_, i) => `<button class="rate-btn" role="radio" aria-checked="false" data-n="${i + 1}">${i + 1}</button>`).join('')}
          </div>
          <div class="rating-ends fine"><span>Regret it</span><span>Worth every minute</span></div>
        </div>
        <div class="screen-foot" id="rate-foot">
          <button class="btn btn-quiet" id="delete">Delete this log</button>
        </div>
      </section>`);

    app.querySelectorAll('.rate-btn').forEach(b => {
      b.onclick = () => {
        const n = Number(b.dataset.n);
        app.querySelectorAll('.rate-btn').forEach(x => { x.disabled = true; x.setAttribute('aria-checked', x === b); });
        log.rating = n;
        log.ratedAt = new Date().toISOString();
        storage.save(state);
        setTimeout(() => showRatingResult(log), 350);
      };
    });
    app.querySelector('#delete').onclick = () => {
      state.logs = state.logs.filter(l => l !== log);
      storage.save(state);
      gateTotal = Math.max(0, gateTotal - 1);
      screenRating();
    };
  }

  function showRatingResult(log) {
    const regret = calc.isRegret(log);
    const ledger = calc.regretLedger(state.logs);
    const n = Math.max(1, Math.min(60, Math.round(log.lifeHours)));
    const more = calc.ratingsDue(state.logs, new Date()).length > 0;
    app.querySelector('#rate-body').innerHTML = `
      <h1>${regret ? 'Marked as regretted.' : 'Marked as worth it.'}</h1>
      <p class="lede">${regret
        ? 'These ' + fmtHours(log.lifeHours) + ' go on your regret ledger. That’s ' + fmtHours(ledger.hours) + ' in total now.'
        : 'These ' + fmtHours(log.lifeHours) + ' were well spent. They’ll stay green on your week.'}</p>
      <div class="dots recolour">${Array.from({ length: n }, (_, i) => `<span class="dot pending" style="--i:${i}"></span>`).join('')}</div>`;
    app.querySelector('#rate-foot').innerHTML =
      `<button class="btn btn-primary" id="next">${more ? 'Next' : 'Done'}</button>`;
    // Let the grey dots paint first, then turn them one by one
    requestAnimationFrame(() => requestAnimationFrame(() => {
      app.querySelectorAll('.recolour .dot').forEach(d => { d.classList.remove('pending'); d.classList.add(regret ? 'regret' : 'worth'); });
    }));
    const next = app.querySelector('#next');
    next.focus({ preventScroll: true });
    next.onclick = () => screenRating();
  }

  // If something comes due while home is open, open the gate
  setInterval(() => {
    if (currentScreen === 'home' && calc.ratingsDue(state.logs, new Date()).length) screenRating();
  }, 10000);

  // ---------- Automatic logging from Apple Pay ----------
  function appUrl() {
    return location.href.split(/[?#]/)[0];   // works on a live site and when opened from the folder
  }

  // One tap adds the shortcut; one short automation turns it on for card payments.
  // Apple only lets the user create automations themselves, so that part can't be skipped.
  function screenAutoSetup() {
    currentScreen = 'setup';
    const shortcutUrl = LH.config && LH.config.SHORTCUT_URL;
    const onIphone = /iPhone|iPod/.test(navigator.userAgent);
    const done = !!state.autoLogConnected;
    render(`
      <section class="screen">
        <header class="home-head">
          <button class="btn btn-quiet" id="back" style="padding:0">Back</button>
          ${done ? '<span class="pill">Connected</span>' : ''}
        </header>
        <div class="screen-body">
          <h1 style="font-size:28px">Log card payments automatically</h1>
          <p class="lede">Every time you pay with Apple Pay, Life-hours opens with the shop and amount filled in. You just confirm.</p>
          ${onIphone ? '' : `<p class="essential-note" style="margin:0 0 20px">This works on iPhone. Open this page on your phone to set it up.</p>`}

          <div class="setup-step">
            <span class="setup-n">1</span>
            <div>
              <strong>Add the shortcut</strong>
              <p class="fine" style="margin:2px 0 10px">${shortcutUrl ? 'Opens Shortcuts. Tap <em>Add Shortcut</em>.' : 'Do this once.'}</p>
              ${shortcutUrl
                ? `<a class="btn btn-primary btn-sm" id="add" href="${esc(shortcutUrl)}">Add to Shortcuts</a>`
                : `<details class="build-own">
                    <summary>How to build it (2 minutes)</summary>
                    <ol>
                      <li>New shortcut, named <em>Life-hours</em>.</li>
                      <li>Add <em>Text</em> and paste the link below, then replace <em>[Merchant]</em> and <em>[Amount]</em> with the <em>Shortcut Input</em> Merchant and Amount variables.</li>
                      <li>Add <em>Open URLs</em>.</li>
                    </ol>
                    <code class="url-box">${esc(appUrl())}?merchant=[Merchant]&amp;amount=[Amount]</code>
                    <button class="btn btn-ghost btn-sm" id="copy">Copy the link</button>
                  </details>`}
            </div>
          </div>

          <div class="setup-step">
            <span class="setup-n">2</span>
            <div>
              <strong>Turn it on for card payments</strong>
              <p class="fine" style="margin:2px 0 10px">In Shortcuts: <em>Automation</em> → <em>+</em> → <em>Transaction</em> → pick your cards → <em>Run Immediately</em> → choose <em>Life-hours</em>.</p>
              <a class="btn btn-ghost btn-sm" href="shortcuts://">Open Shortcuts</a>
            </div>
          </div>
        </div>
        <div class="screen-foot">
          <button class="btn btn-quiet" id="try">Try a pretend payment</button>
        </div>
      </section>`);
    app.querySelector('#back').onclick = () => screenHome();
    const copy = app.querySelector('#copy');
    if (copy) copy.onclick = async () => {
      try { await navigator.clipboard.writeText(appUrl() + '?merchant=[Merchant]&amount=[Amount]'); copy.textContent = 'Copied'; }
      catch (err) { copy.textContent = 'Press and hold the link to copy it'; }
    };
    // Goes through the real link, exactly as the shortcut would
    app.querySelector('#try').onclick = () => {
      location.href = appUrl() + '?merchant=' + encodeURIComponent('PRET A MANGER 0142') + '&amount=' + encodeURIComponent('£8.50') + '&demo=1';
    };
  }

  // Read a payment link once, then clear it so a refresh doesn't log it twice
  function takePaymentFromUrl() {
    const payment = LH.payments.fromUrl(location.href);
    if (payment) history.replaceState(null, '', appUrl());
    if (payment && (state.handledPayments || []).includes(payment.key)) return null;
    return payment;
  }

  // ---------- Start ----------
  const incomingPayment = takePaymentFromUrl();
  if (!state.profile) {
    pendingPayment = incomingPayment;   // log it straight after onboarding
    screenHook();
  } else if (incomingPayment) {
    screenLog(incomingPayment);
  } else {
    screenHome();
  }
})();

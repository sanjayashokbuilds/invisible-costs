/* app.js — screens and buttons. Maths lives in calc.js; this file only displays. */
(function () {
  const { calc, storage } = LH;
  const app = document.getElementById('app');
  let state = storage.load();

  // Onboarding answers, kept until the profile is saved
  const draft = {
    mode: null,
    takeHomeHourly: null,
    weeklyBudget: null,
    sleepHoursPerNight: 8,
    lectureHoursPerWeek: 20,
    workHoursPerWeek: 0,
    otherHoursPerWeek: 14,
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
  function dotsHtml(total, { spent = 0, regret = 0, preview = 0, reveal = false } = {}) {
    let html = '';
    for (let i = 0; i < total; i++) {
      let cls = 'dot';
      if (i < regret) cls += ' regret';
      else if (i < spent) cls += ' spent';
      else if (i < spent + preview) cls += ' preview';
      html += '<span class="' + cls + '" style="--i:' + i + '"></span>';
    }
    return '<div class="dots' + (reveal ? ' reveal' : '') + '" role="img" aria-label="' +
      total + ' free hours, ' + spent + ' spent">' + html + '</div>';
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
      { key: 'otherHoursPerWeek', label: 'Other must-dos', sub: 'cooking, chores, travel', step: 1, min: 0, max: 80 },
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
    const payingLabel = draft.mode === 'job' ? 'working to pay' : 'of your budget';
    render(`
      <section class="screen">
        ${steps(4)}
        <div class="screen-body">
          <p class="muted" style="margin:0">This is your week.</p>
          <div class="big-number">${free}<small>free hours</small></div>
          ${dotsHtml(free, { preview: exampleDots, reveal: true })}
          <div class="fade-late" style="--delay:${Math.min(free * 18, 900) + 400}ms">
            <p style="margin:0 0 10px">Every hour you spend is one of these. So is every pound, because it took time to earn. Take ${EXAMPLE.label}:</p>
            <div class="equation" aria-label="${fmtHours(b.doing)} doing it plus ${fmtHours(b.paying)} ${payingLabel} equals ${fmtHours(b.total)}">
              <div class="part"><div class="n">${fmtHours(b.doing)}</div><div class="l">doing it</div></div>
              <div class="op">+</div>
              <div class="part"><div class="n">${fmtHours(b.paying)}</div><div class="l">${payingLabel}</div></div>
              <div class="op">=</div>
              <div class="part"><div class="n">${fmtHours(b.total)}</div><div class="l">life-hours</div></div>
            </div>
            <p class="fine">That’s ${pct}% of your free week — the dots breathing above.</p>
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
      screenHome();
    };
    app.querySelector('#back').onclick = screenWeek;
  }

  // ---------- Home ----------
  function screenHome() {
    const p = state.profile;
    const now = new Date();
    const free = Math.round(calc.freeHoursPerWeek(p));
    const week = calc.logsThisWeek(state.logs, now);
    const used = calc.hoursUsedThisWeek(state.logs, now);
    const regretWeek = week.filter(calc.isRegret).reduce((a, l) => a + l.lifeHours, 0);
    const ledger = calc.regretLedger(state.logs);
    const left = Math.max(0, free - used);
    render(`
      <section class="screen">
        <header class="home-head">
          <span class="wordmark">Life-hours</span>
          <span class="fine">This week</span>
        </header>
        <div class="screen-body">
          <div class="big-number">${Math.round(left)}<small>of ${free} free hours left</small></div>
          ${dotsHtml(free, { spent: Math.min(free, Math.round(used)), regret: Math.min(free, Math.round(regretWeek)) })}
          <div class="legend">
            <span><i style="background:var(--spent)"></i>Spent</span>
            <span><i style="background:var(--regret)"></i>Regretted</span>
            <span><i style="box-shadow:inset 0 0 0 1.5px var(--line)"></i>Still yours</span>
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
        </div>
        <div class="screen-foot">
          <button class="btn btn-primary" id="log">Log something</button>
          <button class="btn btn-quiet" id="reset">Start over</button>
        </div>
      </section>`);
    app.querySelector('#log').onclick = () => { app.querySelector('#log').textContent = 'Logging comes next'; };
    app.querySelector('#reset').onclick = () => { state = storage.reset(); screenHook(); };
  }

  // ---------- Start ----------
  if (state.profile) screenHome(); else screenHook();
})();

# Life-hours

**See what your spending really costs, in hours of your life.**

**Live:** https://life-hours.netlify.app · **Track:** Fintech · **Theme:** Invisible Costs

<p>
  <img src="docs/screenshots/2-reveal.png" width="200" alt="The reveal: a student's free week as dots">
  <img src="docs/screenshots/3-home.png" width="200" alt="Home: worth-it, regretted and unrated hours this week">
  <img src="docs/screenshots/4-log.png" width="200" alt="Logging: life-hours cost and your past ratings">
  <img src="docs/screenshots/6-apple-pay.png" width="200" alt="A card payment logged automatically">
</p>

---

## The problem

Every purchase has two prices: the pounds, and the hours it took to get them. Students only ever see the first.

UK students spend about **£1,142 a month**, and the average Maintenance Loan falls **£502 a month** short of that ([Save the Student, 2025](https://www.savethestudent.org/money/surveys/student-money-survey-2025-results.html)). A large share goes on things students later say they regret: in NatWest's 2025 Student Living Index, **40%** named takeaways and eating out as their top spending mistake, **32%** alcohol and **22%** clothes ([via UCAS](https://www.ucas.com/money-and-student-life/money/managing-money/how-are-students-spending-and-budgeting-in-2025)).

That is the invisible cost: **hours of your life spent on things you didn't actually enjoy**. A banking app shows you spent £16 on Deliveroo. It never shows you that it took 10 hours of your week to pay for it, or that you rated it 3/10 the last three times.

## What I built

A mobile web app that prices every choice in **life-hours** and learns which choices are actually worth it to you.

- **Life-hours, the full price of a choice.** `time spent doing it + price ÷ your hourly rate`. This is Gary Becker's "full price" idea (1965), expressed in hours instead of pounds.
- **Works for students with or without a job.** With a job, the rate is your take-home wage. On a loan, it's your weekly budget ÷ your free hours, so spending all your money equals losing your whole free week.
- **Your free week as dots.** Each dot is one free hour this week. They fill **green** (worth it), **red** (regretted, also shown as a ring so it reads without colour) or **grey** (not rated yet).
- **Logging in three taps**, with automatic categorisation into six categories built from UK student spending surveys. Essentials (rent, groceries, bills) are recognised and left out, because they aren't choices.
- **Automatic logging from Apple Pay.** An iPhone Wallet automation opens Life-hours the moment you tap your card, with the shop and amount already filled in.
- **A rating gate.** When a rating is due, you rate it before you can log anything new. The timing depends on the category: a night out is rated at 11am the next morning, not at 2am.
- **Your track record, not advice.** While you log, the app shows how you rated this last time ("4, 2, 3"). It never tells you what to do.
- **A regret ledger that never resets**, translated into opportunity cost: *"That's enough for 5-a-side with mates 14 more times, your best-rated thing."*
- **Try it with sample data**: three weeks of a student's history in one tap, so anyone can see the app lived-in.

## How it works

```
Onboarding ──► profile (job or loan, sleep, lectures, work, daily basics)
                 │
                 ▼
     hourly rate + free hours a week           calc.js
                 │
 Log (typed, or from Apple Pay) ──► category    categorise.js  ◄── keywords.js (from survey data)
                 │                              payments.js    ◄── ?merchant=…&amount=… links
                 ▼
     life-hours = time + £ ÷ rate               calc.js
                 │
     rating due (per category) ──► rating gate
                 │
                 ▼
  green / red dots · regret ledger · track record · best alternative
```

| File | What it does |
|---|---|
| `js/calc.js` | All the maths, with no screen code: life-hours, free week, hourly rate for both modes, regret ledger, recency-weighted forecasts, joy per life-hour ranking, best alternative |
| `js/categorise.js` | The six categories and the first-match rule. A longer, more specific phrase wins ("phone" → Screen time, "phone bill" → essential) |
| `js/keywords.js` | 481 keywords, **generated** by `data-prep/build_keywords.py` from survey spending categories |
| `js/payments.js` | Reads payment links from the iPhone automation and cleans Wallet merchant names (`SQ *BLUE BOTTLE CAFE 0142` → `Blue Bottle Cafe`) |
| `js/seed.js` | Starting forecasts from UK Time Use Survey enjoyment ratings, plus the sample data |
| `js/storage.js` | Saves to the browser's localStorage |
| `js/motion.js` | Animations (all switched off for people who ask their device for reduced motion) |
| `js/app.js` | Screens and buttons |
| `tests/` | 54 automated checks, plus categoriser accuracy on 109 realistic phrases |
| `data-prep/` | Python scripts that build the keyword list and starting forecasts from the source data |

**Stack:** plain HTML, CSS and JavaScript (no framework, no build step, runs straight from the folder), localStorage, Python for data prep, hosted on Netlify. Everything is free.

**Privacy:** there is no account and no server. Your spending never leaves your phone.

### Data used

| Data | Used for |
|---|---|
| [Save the Student, National Student Money Survey 2025 and 2026](https://www.savethestudent.org/money/surveys/student-money-survey-2026-results.html) | Which spending categories students have, and how much they spend on each |
| [NatWest Student Living Index 2025](https://www.ucas.com/money-and-student-life/money/managing-money/how-are-students-spending-and-budgeting-in-2025) | What students say they waste money on |
| UK Time Use Survey 2014-15 enjoyment ratings, as group averages ([UC3M, 2025](https://csslab.uc3m.es/dataviz/projects/2025/100572934/)) | Starting forecasts before a user has rated anything |
| Time-use survey coding rules (HETUS, Statistics Canada GSS) | The "main activity" rule for sorting anything into one category |

## Built vs faked in 24 hours

**Built and working**
- Everything listed under *What I built*, live at the link above.
- Apple Pay auto-logging, tested on my own iPhone (iOS 18).
- 54 automated tests, all passing.

**Faked, simplified or limited**
- **AI categorisation was designed but not connected.** This was a no-cost practice run, so I didn't buy API credits. Keyword matching is used instead. `categorise()` is the single place an AI call would plug in, for words the keyword list doesn't know.
- **Apple Pay setup is manual.** Apple only lets people create Wallet automations themselves, so no app or website can set it up for you. It takes about two minutes, once. iPhone only.
- **Apple Pay logs *after* you pay.** Apple doesn't let any app step in before a payment.
- **The categoriser's 100% score (109/109) is on phrases I wrote myself**, alongside the keyword list, so it's inflated. Real accuracy on unseen phrases will be lower.
- **Starting forecasts are group averages** (e.g. "social / out-of-home": 6.07 out of 7), not per activity. They measure enjoyment *in the moment*, so they run high. A user's own ratings replace them after one log.
- **Data stays on one device and in one browser.** There's no sync between devices, and clearing browser data wipes it.
- **The sample data is invented**, but built to match the spending categories and amounts in the surveys above.

## What I learned

- **The idea had to survive the economics first.** My first version counted every hour not spent working or studying as a cost. That's the wrong opportunity cost: the real cost is the next best alternative, and rest and friends have value. Reframing it as "hours spent on things you regret" made the app both more accurate and less of a guilt trip.
- **Check that every number is measured on the same scale.** The loan version first divided the budget by *waking* hours but drew it on *free* hours. The maths was right, but the dots overstated the cost. Fixing the denominator made the money and the dots tell the same story.
- **Manual logging is where apps like this die**, so the biggest win was removing it. Apple Pay auto-logging was worth more than any extra feature.
- **Platforms set hard limits, and the honest move is to design around them and say so.** Apple won't let apps create automations or step in before a payment, so I built the best version that's actually possible and documented the rest.
- **A clear question beats a long build.** Most of the important decisions came from questioning the design before writing any code.

## Running it

- **Live:** https://life-hours.netlify.app. On the first screen, tap *Try it with sample data* to see a lived-in version.
- **Locally:** open `index.html` in a browser. There's nothing to install.
- **Tests:** `node tests/run-tests.js`
- **Rebuild the data:** `python3 data-prep/build_keywords.py` and `python3 data-prep/build_priors.py`

### Setting up Apple Pay auto-logging (iPhone)
In the app: **Log card payments automatically**. In short:
1. Shortcuts → **Automation** → **+** → **Wallet** → choose your card → **Run Immediately** → **New Blank Automation**.
2. Add **URL Encode** with *Shortcut Input → Merchant*.
3. Add **Text**: `https://life-hours.netlify.app/?merchant=` [URL Encoded Text] `&amount=` [Shortcut Input → Amount].
4. Add **Open URLs**.

Set up Life-hours in the browser the link opens in (your default browser), because each browser keeps its own data.

## Next steps
- **Open Banking:** one permission screen and every card payment arrives automatically, on Android too.
- **A pause before spending:** open Life-hours when apps like Deliveroo or a betting app are opened, showing your own track record first.
- **Hours saved:** a running total for the times you checked and decided not to.
- **Accounts and sync** across devices.
- **AI categorisation** for anything the keyword list doesn't know.

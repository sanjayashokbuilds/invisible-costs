/* calc.js — the core maths. No screen code lives here.
 *
 * Life-hours (Becker's "full price", in hours):
 *   lifeHours = time spent + (price ÷ hourly rate)
 * Hourly rate:
 *   job  → take-home £ per hour
 *   loan → weekly budget ÷ waking hours per week
 */
(function (root) {
  const HOURS_PER_WEEK = 168;
  const REGRET_THRESHOLD = 4; // ratings 1–10; 4 or below counts as regret
  const RECENCY_WEIGHT = 0.7; // each older rating counts 70% as much as the next newer one

  // ---------- Profile ----------
  function wakingHoursPerWeek(p) {
    return HOURS_PER_WEEK - p.sleepHoursPerNight * 7;
  }

  function freeHoursPerWeek(p) {
    const free = wakingHoursPerWeek(p)
      - (p.lectureHoursPerWeek || 0)
      - (p.workHoursPerWeek || 0)
      - (p.otherHoursPerWeek || 0);
    return Math.max(free, 0);
  }

  function hourlyRate(p) {
    if (p.mode === 'job') return p.takeHomeHourly;
    if (p.mode === 'loan') return p.weeklyBudget / wakingHoursPerWeek(p);
    throw new Error('Unknown funding mode: ' + p.mode);
  }

  // ---------- Life-hours ----------
  function lifeHours(price, durationHours, rate) {
    if (!(rate > 0)) throw new Error('Hourly rate must be above zero');
    return durationHours + price / rate;
  }

  // Split, so the UI can show "2h doing it + 1.7h paying for it"
  function lifeHoursBreakdown(price, durationHours, rate) {
    const paying = price / rate;
    return { doing: durationHours, paying, total: durationHours + paying };
  }

  function shareOfFreeWeek(lh, freeHours) {
    return freeHours > 0 ? lh / freeHours : 0;
  }

  // ---------- The week (Monday 00:00 start) ----------
  function weekStart(date) {
    const d = new Date(date);
    const daysSinceMonday = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysSinceMonday);
    return d;
  }

  function logsThisWeek(logs, now) {
    const start = weekStart(now).getTime();
    return logs.filter(l => new Date(l.loggedAt).getTime() >= start);
  }

  function hoursUsedThisWeek(logs, now) {
    return sum(logsThisWeek(logs, now).map(l => l.lifeHours));
  }

  // ---------- Regret ledger (never resets) ----------
  function isRegret(log) {
    return typeof log.rating === 'number' && log.rating <= REGRET_THRESHOLD;
  }

  function regretLedger(logs) {
    const regretted = logs.filter(isRegret);
    return { hours: sum(regretted.map(l => l.lifeHours)), count: regretted.length };
  }

  // ---------- Forecasts ----------
  function normalise(name) {
    return name.trim().toLowerCase();
  }

  // Weighted average, newest rating counts most
  function recencyWeightedAverage(ratingsNewestFirst) {
    let total = 0, weights = 0;
    ratingsNewestFirst.forEach((r, i) => {
      const w = Math.pow(RECENCY_WEIGHT, i);
      total += r * w;
      weights += w;
    });
    return weights ? total / weights : null;
  }

  function ratedNewestFirst(logs, predicate) {
    return logs
      .filter(l => typeof l.rating === 'number' && predicate(l))
      .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
  }

  // Order of preference: this exact activity → this category → seed prior
  function forecast(activity, category, logs, seedPriors) {
    const own = ratedNewestFirst(logs, l => normalise(l.activity) === normalise(activity));
    if (own.length) {
      return {
        value: recencyWeightedAverage(own.map(l => l.rating)),
        source: 'activity',
        n: own.length,
        lastRatings: own.slice(0, 3).map(l => l.rating),
      };
    }
    const sameCat = ratedNewestFirst(logs, l => l.category === category);
    if (sameCat.length) {
      return {
        value: recencyWeightedAverage(sameCat.map(l => l.rating)),
        source: 'category',
        n: sameCat.length,
        lastRatings: sameCat.slice(0, 3).map(l => l.rating),
      };
    }
    const prior = seedPriors && seedPriors[category];
    return { value: prior != null ? prior : null, source: 'seed', n: 0, lastRatings: [] };
  }

  // ---------- Value ranking: joy per life-hour ----------
  function valueRanking(logs) {
    const groups = {};
    logs.filter(l => typeof l.rating === 'number').forEach(l => {
      const key = normalise(l.activity);
      const g = groups[key] || (groups[key] = { activity: l.activity, category: l.category, ratingSum: 0, hours: 0, n: 0 });
      g.ratingSum += l.rating;
      g.hours += l.lifeHours;
      g.n += 1;
    });
    return Object.values(groups)
      .map(g => ({
        activity: g.activity,
        category: g.category,
        n: g.n,
        avgRating: g.ratingSum / g.n,
        avgLifeHours: g.hours / g.n,
        joyPerHour: g.hours > 0 ? g.ratingSum / g.hours : 0,
      }))
      .sort((a, b) => b.joyPerHour - a.joyPerHour);
  }

  // The user's best-rated activity: the "next best alternative" for the regret ledger
  function bestAlternative(logs, minTimes) {
    const ranked = valueRanking(logs).filter(r => r.n >= (minTimes || 2));
    if (!ranked.length) return null;
    return ranked.slice().sort((a, b) => b.avgRating - a.avgRating)[0];
  }

  // ---------- Habit projection ----------
  function habitProjection(price, lh, timesPerWeek) {
    const perYear = timesPerWeek * 52;
    return { poundsPerYear: price * perYear, lifeHoursPerYear: lh * perYear };
  }

  // ---------- Rating gate ----------
  function ratingsDue(logs, now) {
    const t = new Date(now).getTime();
    return logs.filter(l => typeof l.rating !== 'number' && new Date(l.ratingDueAt).getTime() <= t);
  }

  function sum(xs) {
    return xs.reduce((a, b) => a + b, 0);
  }

  root.LH = root.LH || {};
  root.LH.calc = {
    REGRET_THRESHOLD,
    wakingHoursPerWeek, freeHoursPerWeek, hourlyRate,
    lifeHours, lifeHoursBreakdown, shareOfFreeWeek,
    weekStart, logsThisWeek, hoursUsedThisWeek,
    isRegret, regretLedger,
    forecast, recencyWeightedAverage,
    valueRanking, bestAlternative,
    habitProjection, ratingsDue,
  };
})(typeof window !== 'undefined' ? window : globalThis);

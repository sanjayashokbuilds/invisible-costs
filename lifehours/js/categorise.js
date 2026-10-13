/* categorise.js — the six-category rule.
 *
 * Go down the list and stop at the first yes:
 *   1. Shopping   — something you buy to keep
 *   2. Active     — anything physical
 *   3. Screen     — phone, laptop, TV or console
 *   4. Social     — seeing people is the point
 *   5. Food       — the food is the point
 *   6. Other      — everything else
 *
 * categorise() is the ONE place an AI call would plug in later:
 * if no keyword matches, an AI model would be asked instead of falling back to 'other'.
 */
(function (root) {
  const DAY = 24 * 60;

  // Vocabulary is generated from student-survey categories by data-prep/build_keywords.py
  const KW = (root.LH && root.LH.keywords && root.LH.keywords.KEYWORDS) || {};

  // ratingDelay: minutes after logging, or 'nextMorning' (11:00 the next day)
  const CATEGORIES = [
    // defaultHours: the duration pre-filled on the log screen
    { id: 'shopping', label: 'Shopping', ratingDelay: 2 * DAY, defaultHours: 0.5 },
    { id: 'active', label: 'Active', ratingDelay: 60, defaultHours: 1.5 },
    { id: 'screen', label: 'Screen time', ratingDelay: 30, defaultHours: 1 },
    { id: 'social', label: 'Social & going out', ratingDelay: 'nextMorning', defaultHours: 4 },
    { id: 'food', label: 'Food & drink', ratingDelay: 120, defaultHours: 0.5 },
    { id: 'other', label: 'Everything else', ratingDelay: 180, defaultHours: 1 },
  ].map(c => ({ ...c, keywords: KW[c.id] || [] }));

  // Essentials (rent, groceries, bills…) are recognised but not tracked: no opportunity cost to reveal
  const ESSENTIAL = { id: 'essential', keywords: KW.essential || [] };
  const ORDER = [...CATEGORIES, ESSENTIAL];
  const BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

  function clean(s) {
    return s.toLowerCase().replace(/[’']/g, '');
  }

  // Whole-word match (so "pub" doesn't match "public"), allowing a plural 's'.
  // Returns the matched span, or null.
  function findSpan(text, keyword) {
    const escaped = clean(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp('(^|[^a-z0-9])(' + escaped + 's?)(?=$|[^a-z0-9])').exec(text);
    if (!m) return null;
    const start = m.index + m[1].length;
    return { start, end: start + m[2].length, keyword };
  }

  // The longest matching phrase in this category (most specific)
  function firstHit(text, cat) {
    let best = null;
    for (const k of cat.keywords) {
      const span = findSpan(text, k);
      if (span && (!best || span.end - span.start > best.end - best.start)) best = span;
    }
    return best;
  }

  const strictlyContains = (a, b) => a.start <= b.start && a.end >= b.end && (a.end - a.start) > (b.end - b.start);

  // Rule: first category in ORDER with a match wins — unless a later category matched a
  // longer phrase that contains it ("phone" → screen, but "phone bill" → essential).
  function categorise(description) {
    const text = clean(description);
    const hits = ORDER.map(cat => ({ cat, span: firstHit(text, cat) })).filter(h => h.span);
    if (hits.length) {
      let winner = hits[0];
      for (const h of hits.slice(1)) {
        if (strictlyContains(h.span, winner.span)) winner = h;
      }
      return {
        category: winner.cat.id === 'essential' ? null : winner.cat.id,
        essential: winner.cat.id === 'essential',
        matched: winner.span.keyword,
      };
    }
    // AI categorisation would go here (designed, not connected — see README)
    return { category: 'other', essential: false, matched: null };
  }

  function ratingDueAt(categoryId, loggedAt) {
    const delay = BY_ID[categoryId].ratingDelay;
    const t = new Date(loggedAt);
    if (delay === 'nextMorning') {
      const due = new Date(t);
      due.setDate(due.getDate() + 1);
      due.setHours(11, 0, 0, 0);
      return due;
    }
    return new Date(t.getTime() + delay * 60 * 1000);
  }

  root.LH = root.LH || {};
  root.LH.categories = { CATEGORIES, BY_ID, categorise, ratingDueAt };
})(typeof window !== 'undefined' ? window : globalThis);

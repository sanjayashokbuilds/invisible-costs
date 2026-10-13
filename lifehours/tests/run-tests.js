// Run with: node tests/run-tests.js
require('../js/calc.js');
require('../js/keywords.js');
require('../js/categorise.js');
const assert = require('node:assert/strict');
const { calc, categories } = globalThis.LH;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) < tol, `${a} is not ≈ ${b}`);

console.log('Life-hours maths');
const worker = { mode: 'job', takeHomeHourly: 12, sleepHoursPerNight: 8, lectureHoursPerWeek: 12, workHoursPerWeek: 10, otherHoursPerWeek: 20 };
const loanee = { mode: 'loan', weeklyBudget: 80, sleepHoursPerNight: 8, lectureHoursPerWeek: 12, workHoursPerWeek: 0, otherHoursPerWeek: 20 };

test('waking hours = 168 − 7 × sleep', () => assert.equal(calc.wakingHoursPerWeek(worker), 112));
test('free hours subtracts commitments', () => assert.equal(calc.freeHoursPerWeek(worker), 70));
test('job rate = take-home wage', () => assert.equal(calc.hourlyRate(worker), 12));
test('loan rate = weekly budget ÷ free hours', () => assert.equal(calc.hourlyRate(loanee), 1));
test('spending your whole weekly budget = your whole free week', () => {
  const r = calc.hourlyRate(loanee);
  assert.equal(80 / r, calc.freeHoursPerWeek(loanee));
});
test('£20 on a £120 budget with 78 free hours = 13 life-hours of money', () => {
  const p = { mode: 'loan', weeklyBudget: 120, sleepHoursPerNight: 8, lectureHoursPerWeek: 20, workHoursPerWeek: 0, otherHoursPerWeek: 14 };
  near(20 / calc.hourlyRate(p), 13);
});
test('clubbing: 5h + £20 at £12/h = 6.67 life-hours', () => near(calc.lifeHours(20, 5, 12), 6.67));
test('gaming: 4h, £0 = 4 life-hours', () => assert.equal(calc.lifeHours(0, 4, 12), 4));
test('breakdown splits doing vs paying', () => {
  const b = calc.lifeHoursBreakdown(20, 5, 12);
  assert.equal(b.doing, 5); near(b.paying, 1.67); near(b.total, 6.67);
});
test('zero rate throws instead of dividing by zero', () => assert.throws(() => calc.lifeHours(10, 1, 0)));
test('share of free week', () => near(calc.shareOfFreeWeek(7, 70), 0.1));

console.log('Week and regret');
const logs = [
  { activity: 'Club', category: 'social', lifeHours: 6, rating: 3, loggedAt: '2026-10-12T22:00:00', ratingDueAt: '2026-10-13T11:00:00' },
  { activity: 'club', category: 'social', lifeHours: 6, rating: 7, loggedAt: '2026-10-05T22:00:00', ratingDueAt: '2026-10-06T11:00:00' },
  { activity: 'Gym', category: 'active', lifeHours: 1.5, rating: 8, loggedAt: '2026-10-13T08:00:00', ratingDueAt: '2026-10-13T09:00:00' },
  { activity: 'Gym', category: 'active', lifeHours: 1.5, rating: 9, loggedAt: '2026-10-06T08:00:00', ratingDueAt: '2026-10-06T09:00:00' },
  { activity: 'TikTok', category: 'screen', lifeHours: 2, rating: 2, loggedAt: '2026-10-11T23:00:00', ratingDueAt: '2026-10-11T23:30:00' },
  { activity: 'Deliveroo', category: 'food', lifeHours: 2.5, loggedAt: '2026-10-13T13:00:00', ratingDueAt: '2026-10-13T15:00:00' },
];
const now = new Date('2026-10-13T14:41:00');

test('week starts Monday 00:00', () => assert.equal(calc.weekStart(now).toDateString(), new Date('2026-10-12T00:00:00').toDateString()));
test('hours used this week only counts this week', () => near(calc.hoursUsedThisWeek(logs, now), 6 + 1.5 + 2.5));
test('regret ledger counts ratings ≤ 4, across all weeks', () => {
  const r = calc.regretLedger(logs); assert.equal(r.hours, 8); assert.equal(r.count, 2);
});
test('unrated logs are not regret', () => assert.equal(calc.isRegret(logs[5]), false));

console.log('Forecasts');
test('activity forecast is recency-weighted (newest 3 beats older 7)', () => {
  const f = calc.forecast('CLUB', 'social', logs, {});
  assert.equal(f.source, 'activity'); assert.equal(f.n, 2);
  near(f.value, (3 * 1 + 7 * 0.7) / 1.7); assert.deepEqual(f.lastRatings, [3, 7]);
});
test('falls back to category when activity is new', () => {
  const f = calc.forecast('Padel', 'active', logs, {}); assert.equal(f.source, 'category'); near(f.value, (8 + 9 * 0.7) / 1.7);
});
test('falls back to seed prior with no history', () => {
  const f = calc.forecast('Vinted haul', 'shopping', logs, { shopping: 6 }); assert.equal(f.source, 'seed'); assert.equal(f.value, 6);
});

console.log('Value ranking and projection');
test('gym ranks above club on joy per life-hour', () => {
  const r = calc.valueRanking(logs); assert.equal(r[0].activity, 'Gym'); near(r[0].joyPerHour, 17 / 3);
});
test('best alternative is highest avg rating with 2+ logs', () => assert.equal(calc.bestAlternative(logs).activity, 'Gym'));
test('£20 weekly habit = £1,040 a year', () => assert.equal(calc.habitProjection(20, 6.67, 1).poundsPerYear, 1040));

console.log('Rating gate');
test('only unrated logs past their due time are due', () => {
  assert.equal(calc.ratingsDue(logs, now).length, 0);
  assert.equal(calc.ratingsDue(logs, new Date('2026-10-13T15:30:00')).length, 1);
});

console.log('Categorisation rule');
const cases = [
  ['golf with mates', 'active'],
  ['dinner with friends', 'social'],
  ['takeaway alone', 'food'],
  ['gaming with friends online', 'screen'],
  ['cinema with friends', 'social'],
  ['online betting', 'screen'],
  ['bookies', 'other'],
  ['new trainers from asos', 'shopping'],
  ['public library', 'other'], // "pub" must not match "public"
  ['falconry', 'other'], // unknown word → fallback (where AI would plug in)
];
cases.forEach(([text, expected]) =>
  test(`"${text}" → ${expected}`, () => assert.equal(categories.categorise(text).category, expected)));
test('social rating due 11:00 next morning', () => {
  const d = categories.ratingDueAt('social', new Date('2026-10-12T23:30:00'));
  assert.equal(d.getDate(), 13); assert.equal(d.getHours(), 11);
});
test('screen rating due 30 min later', () => {
  const d = categories.ratingDueAt('screen', new Date('2026-10-12T20:00:00'));
  assert.equal(d.getHours(), 20); assert.equal(d.getMinutes(), 30);
});

console.log('\nCategoriser accuracy on realistic student phrases');
const phrases = require('./phrases.js');
const misses = phrases.filter(([t, exp]) => categories.categorise(t).category !== exp);
const pct = Math.round(100 * (phrases.length - misses.length) / phrases.length);
console.log(`  ${phrases.length - misses.length}/${phrases.length} correct (${pct}%)`);
misses.forEach(([t, exp]) => {
  const r = categories.categorise(t);
  console.log(`  miss "${t}": got ${r.category} (matched "${r.matched}"), expected ${exp}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

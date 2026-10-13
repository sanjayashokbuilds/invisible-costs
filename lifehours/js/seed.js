/* seed.js — starting forecasts and the sample data.
 *
 * SEED_PRIORS: expected rating out of 10 for each category before a user has any ratings.
 * Built by data-prep/build_priors.py from UK Time Use Survey 2014-15 enjoyment ratings
 * (1–7, rescaled to 1–10). They measure enjoyment in the moment, so they run high;
 * a user's own ratings replace them after a single log.
 */
(function (root) {
  const SEED_PRIORS = {
    social: 8.6,
    active: 8.5,
    other: 8.1,
    food: 8.0,
    screen: 7.9,
    shopping: 6.7,
  };
  const PRIOR_SOURCE = 'UK Time Use Survey 2014-15';

  // Sample data: a student on a £120/week loan budget, about three weeks in.
  // day: days before this week started (positive) or 0 = this week; hour: time of day.
  // rating null = not rated yet.
  const DEMO_PROFILE = {
    mode: 'loan', weeklyBudget: 120, takeHomeHourly: null,
    sleepHoursPerNight: 8, lectureHoursPerWeek: 20, workHoursPerWeek: 0,
    basicsHoursPerDay: 2, otherHoursPerWeek: 14,
  };
  const DEMO_LOGS = [
    // Two weeks ago
    { activity: 'Gym', category: 'active', price: 0, hours: 1.5, rating: 8, day: 13, hour: 8 },
    { activity: 'Deliveroo', category: 'food', price: 16, hours: 0.5, rating: 3, day: 12, hour: 23 },
    { activity: 'Clubbing', category: 'social', price: 22, hours: 4, rating: 7, day: 11, hour: 23 },
    { activity: 'TikTok', category: 'screen', price: 0, hours: 2, rating: 2, day: 10, hour: 1 },
    { activity: 'Pret coffee', category: 'food', price: 3.5, hours: 0.25, rating: 6, day: 10, hour: 10 },
    { activity: '5 a side with mates', category: 'active', price: 6, hours: 1.5, rating: 9, day: 9, hour: 18 },
    { activity: 'Vinted haul', category: 'shopping', price: 34, hours: 1, rating: 3, day: 8, hour: 21 },
    // Last week
    { activity: 'Gym', category: 'active', price: 0, hours: 1.5, rating: 9, day: 6, hour: 8 },
    { activity: 'Pub quiz with flatmates', category: 'social', price: 12, hours: 3, rating: 8, day: 6, hour: 19 },
    { activity: 'Deliveroo', category: 'food', price: 14, hours: 0.5, rating: 2, day: 5, hour: 0 },
    { activity: 'Netflix', category: 'screen', price: 0, hours: 2.5, rating: 6, day: 5, hour: 21 },
    { activity: 'Clubbing', category: 'social', price: 25, hours: 4.5, rating: 3, day: 3, hour: 23 },
    { activity: 'TikTok', category: 'screen', price: 0, hours: 1.5, rating: 3, day: 2, hour: 1 },
    { activity: 'Pret coffee', category: 'food', price: 3.5, hours: 0.25, rating: 5, day: 2, hour: 10 },
    { activity: "Nando's with flatmates", category: 'social', price: 15, hours: 1.5, rating: 8, day: 1, hour: 19 },
    // This week (placed between the start of the week and now)
    { activity: 'Gym', category: 'active', price: 0, hours: 1.5, rating: 8, day: 0, slot: 0.15 },
    { activity: 'Deliveroo', category: 'food', price: 15, hours: 0.5, rating: 4, day: 0, slot: 0.35 },
    { activity: 'TikTok', category: 'screen', price: 0, hours: 2, rating: 2, day: 0, slot: 0.55 },
    { activity: '5 a side with mates', category: 'active', price: 6, hours: 1.5, rating: 8, day: 0, slot: 0.75 },
    { activity: 'Clubbing', category: 'social', price: 20, hours: 4, rating: null, day: 0, slot: 1 },
  ];

  root.LH = root.LH || {};
  root.LH.seed = { SEED_PRIORS, PRIOR_SOURCE, DEMO_PROFILE, DEMO_LOGS };
})(typeof window !== 'undefined' ? window : globalThis);

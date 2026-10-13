/* seed.js — starting forecasts and demo data.
 *
 * PLACEHOLDER VALUES. These priors (expected rating out of 10 per category, used
 * before a user has any history) will be replaced with values derived from
 * real survey data by a script in data-prep/.
 */
(function (root) {
  const SEED_PRIORS = {
    shopping: 6,
    active: 7,
    screen: 5,
    social: 7,
    food: 6,
    other: 6,
  };

  root.LH = root.LH || {};
  root.LH.seed = { SEED_PRIORS, DEMO_LOGS: [] };
})(typeof window !== 'undefined' ? window : globalThis);

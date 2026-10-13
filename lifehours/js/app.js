/* app.js — screens and buttons. Built next, once the screen designs are decided. */
(function () {
  const state = LH.storage.load();
  document.getElementById('app').textContent =
    state.profile ? 'Home screen goes here' : 'Onboarding goes here';
})();

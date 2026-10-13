/* storage.js — save/load everything from the browser's localStorage.
 * Data stays on this device only (declared in the README).
 */
(function (root) {
  const KEY = 'lifehours.v1';

  function emptyState() {
    return { profile: null, logs: [] };
  }

  function load() {
    try {
      const raw = root.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : emptyState();
    } catch (e) {
      return emptyState(); // private window, blocked storage, or corrupt data
    }
  }

  function save(state) {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try { root.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return emptyState();
  }

  root.LH = root.LH || {};
  root.LH.storage = { load, save, reset, emptyState };
})(typeof window !== 'undefined' ? window : globalThis);

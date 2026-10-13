/* config.js — settings you fill in once.
 *
 * SHORTCUT_URL: the iCloud link to the "Life-hours" shortcut.
 * Build the shortcut once on an iPhone, then Share → Copy iCloud Link, and paste it here.
 * Until it's set, the setup screen falls back to step-by-step instructions.
 */
(function (root) {
  root.LH = root.LH || {};
  root.LH.config = {
    SHORTCUT_URL: null, // e.g. 'https://www.icloud.com/shortcuts/abc123...'
  };
})(typeof window !== 'undefined' ? window : globalThis);

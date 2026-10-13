/* payments.js — turns a card payment passed in by an iPhone Shortcut into a log.
 *
 * An iOS Shortcuts "Transaction" automation (runs when you tap a Wallet card) opens:
 *   https://<site>/?merchant=<Merchant>&amount=<Amount>
 * Wallet merchant names and amounts are messy, so they're cleaned here first.
 */
(function (root) {
  // Card-terminal prefixes that hide the real shop name: "SQ *BLUE CAFE", "SUMUP *FALAFEL"
  const PROCESSOR_PREFIX = /^(sq|sp|sumup|zettle|iz|izettle|pp|paypal|tst|crv|ctl)\s*[*_\-]\s*/i;
  // Words that are noise on a receipt, not part of the name
  const NOISE = new Set(['ltd', 'limited', 'plc', 'uk', 'gb', 'gbr', 'london', 'store', 'stores', 'branch', 'contactless']);

  function cleanMerchant(raw) {
    if (!raw) return '';
    let s = String(raw).replace(/\+/g, ' ').trim();
    s = s.replace(PROCESSOR_PREFIX, '');
    s = s.replace(/[*_#]+/g, ' ');                       // leftover separators
    const words = s.split(/\s+/).filter(w => w && !/\d/.test(w) && !NOISE.has(w.toLowerCase()));
    const name = words.join(' ').trim() || String(raw).trim();
    // Title case, but keep short words like "a", "&" lower/as-is
    return name.toLowerCase().replace(/\b([a-z])([a-z']*)/g, (m, a, b, i) =>
      (i > 0 && ['a', 'and', 'of', 'the'].includes(m)) ? m : a.toUpperCase() + b);
  }

  // "£8.50", "8.50 GBP", "8,50", "1,250.00" → number (or null)
  function parseAmount(raw) {
    if (raw == null) return null;
    let s = String(raw).replace(/[^\d.,-]/g, '');
    if (s.includes('.') && s.includes(',')) s = s.replace(/,/g, '');   // 1,250.00
    else if (s.includes(',')) s = s.replace(',', '.');                  // 8,50
    const n = Math.abs(parseFloat(s));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  }

  function safeDecode(s) {
    if (s == null) return null;
    s = s.replace(/\+/g, ' ');
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  // Reads one field from the raw query string. Tolerates what a Shortcut can send unencoded:
  // spaces, "£", and an "&" inside a shop name ("M&S"), in either order.
  function rawField(query, name) {
    const others = ['merchant', 'amount', 'demo'].filter(n => n !== name).join('|');
    const m = new RegExp('(?:^|&)' + name + '=(.*?)(?=&(?:' + others + ')=|$)', 'i').exec(query);
    return m ? safeDecode(m[1]) : null;
  }

  // Reads ?merchant=…&amount=… from a URL. Returns null if it isn't a payment link.
  function fromUrl(href) {
    const q = String(href).split('#')[0].split('?').slice(1).join('?');
    if (!/(^|&)(merchant|amount)=/i.test(q)) return null;
    const amount = parseAmount(rawField(q, 'amount'));
    const activity = cleanMerchant(rawField(q, 'merchant'));
    if (!activity && amount == null) return null;
    return {
      activity: activity || 'Card payment',
      price: amount || 0,
      source: 'applepay',
      demo: rawField(q, 'demo') === '1',   // from "Try a pretend payment", not a real card
      // Same shop + amount in the same minute = the Shortcut fired twice
      key: activity.toLowerCase() + '|' + amount + '|' + new Date().toISOString().slice(0, 16),
    };
  }

  root.LH = root.LH || {};
  root.LH.payments = { cleanMerchant, parseAmount, fromUrl };
})(typeof window !== 'undefined' ? window : globalThis);

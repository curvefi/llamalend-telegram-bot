const lc = (string) => string?.toLowerCase();

// Escape number strings for Telegram markdown parser (needs dots escaped)
const escapeNumberForTg = (number) => String(number).replace('.', '\\.');

export {
  lc,
  escapeNumberForTg,
};

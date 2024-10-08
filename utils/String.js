const lc = (string) => string?.toLowerCase();

// Escape number strings for Telegram markdown parser (needs dots and dashes escaped)
const escapeNumberForTg = (number) => String(number).replace('.', '\\.').replace('-', '\\-');

export {
  lc,
  escapeNumberForTg,
};

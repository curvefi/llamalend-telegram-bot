import { localNumber } from './Number.js';

const lc = (string) => string?.toLowerCase();

// Escape number strings for Telegram markdown parser (needs dots and dashes escaped)
const escapeNumberForTg = (number) => String(localNumber(number)).replace('.', '\\.').replace('-', '\\-');

const shortAddress = (address) => (
  `${address?.slice(0, 4)}…${address?.slice(-4)}`
);

export {
  lc,
  escapeNumberForTg,
  shortAddress,
};

import memoize from 'memoizee';

// Use, in order of preference, depending on support:
// - Intl.NumberFormat.prototype.format: it's the most performant
// - Number.toLocaleString: does the same thing, but way slower
// - No formatting at all if no support
const getNumberFormatter = memoize((minimumFractionDigits, maximumFractionDigits) => (
  (typeof window !== 'undefined' && window.Intl && window.Intl.NumberFormat) ?
    new Intl.NumberFormat(undefined, { minimumFractionDigits, maximumFractionDigits }).format :
    Number.toLocaleString ?
      (number) => (
        Number(number).toLocaleString(undefined, { minimumFractionDigits, maximumFractionDigits })
      ) :
      (number) => Number(number)
), { length: 2 });

const localNumber = (
  number,
  minimumFractionDigits = undefined,
  maximumFractionDigits = undefined
) => (
  getNumberFormatter(minimumFractionDigits, maximumFractionDigits)(number)
);

export {
  localNumber,
};

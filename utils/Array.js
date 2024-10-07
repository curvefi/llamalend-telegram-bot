import BN from 'bignumber.js';

const uniq = (array) => Array.from(new Set(array).values());

// arrayOfIncrements(3) -> [0, 1, 2]
const arrayOfIncrements = (count) => [...Array(Number(count)).keys()];

const flattenArray = (arrays) => [].concat(...arrays);

const flatMap = (arr, fn) => flattenArray(arr.map(fn));

const getArrayChunks = (array, maxItemsPerChunk) => {
  const res = [];

  for (let i = 0; array.length > i * maxItemsPerChunk; i += 1) {
    res.push(
      array.slice(i * maxItemsPerChunk, (i * maxItemsPerChunk) + maxItemsPerChunk)
    );
  }

  return res;
};

// [['a', '1'], ['b', 2], …] -> { a: 1, b: 2, … }
const arrayToHashmap = (array) => (
  Object.assign({}, ...array.map(([key, val]) => ({ [key]: val })))
);

const sumBy = (arr, fn) => (
  arr.reduce((total, item) => total + parseFloat(fn(item)), 0)
);

const sumByBN = (arr, fn) => (
  arr.reduce((total, item) => total.plus(fn(item) || 0), BN(0))
);

const sumBN = (arr) => (
  arr ? arr.reduce((total, numberBN) => (
    total.plus(numberBN || 0)
  ), BN(0)) : undefined
);

const sum = (arr) => (
  arr.reduce((total, number) => (
    total + (number || 0)
  ), 0)
);

const removeNulls = (arr) => arr.filter((o) => o !== null);

const mergeWithCommasEndWithOr = (arr) => (
  `${arr.slice(0, -1).join(', ')}, or ${arr[arr.length - 1]}`
);

const mergeWithCommasEndWithAnd = (arr) => (
  `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`
);

export {
  uniq,
  flattenArray,
  flatMap,
  getArrayChunks,
  arrayToHashmap,
  sumBy,
  sumByBN,
  sumBN,
  sum,
  arrayOfIncrements,
  removeNulls,
  mergeWithCommasEndWithOr,
  mergeWithCommasEndWithAnd,
};

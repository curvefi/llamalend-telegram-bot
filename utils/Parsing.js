import BN from 'bignumber.js';

/**
 * Parses uint values into BN values, also ensuring BigInt
 * values returned by ethers are replaced with BNs.
 */
const uintToBN = (uint256OrEBN, decimals) => (
  typeof uint256OrEBN === 'bigint' ?
    BN(uint256OrEBN.toString()).div(BN(10).pow(decimals)) :
    typeof uint256OrEBN !== 'undefined' ?
      BN(uint256OrEBN).div(BN(10).pow(decimals)) :
      undefined
);

/**
 * Ensures the big number passed in (which can be a BN or a
 * a BigInt returned by ethers), comes out as a BN.
 */
const toLocalBN = (anyBN) => (
  typeof anyBN === 'bigint' ?
    BN(anyBN.toString()) :
    BN(anyBN)
);

const numberToUint = (number, decimals) => {
  if (typeof number === 'undefined' || typeof decimals === 'undefined') {
    throw new Error('Missing some mandatory parameters for numberToUint(number, decimals)');
  }

  return BN(number).times(new BN(10).pow(decimals)).toFixed();
};

export {
  uintToBN,
  numberToUint,
  toLocalBN,
};

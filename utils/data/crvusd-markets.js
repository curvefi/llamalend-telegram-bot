import memoize from 'memoizee';
import { fetchPages } from '../Pagination.js';
import { flattenArray, uniq } from '../Array.js';
import getTokensData from './tokens-data.js';
import { lc } from '../String.js';

const getAllCrvusdMarkets = memoize(async () => {
  const crvusdMarkets = await fetchPages('https://prices.curve.fi/v1/crvusd/markets/ethereum', {
    fetch_on_chain: false,
    per_page: 100,
  });

  const allTokenAddresses = uniq(flattenArray(crvusdMarkets.map(({ collateral_token, stablecoin_token }) => [
    collateral_token.address,
    stablecoin_token.address,
  ])));
  const allTokenData = await getTokensData(allTokenAddresses);

  return crvusdMarkets.map(({
    address,
    llamma,
    collateral_token,
    stablecoin_token,
  }) => ({
    // Return the explicit shape and data we need; must match the shape of utils/data/curve-lending-vaults.js
    controllerAddress: address,
    ammAddress: llamma,
    address, // Used to uniquely identify the market, not to query anything, so that works and is compatible with lending
    assets: {
      collateral: {
        decimals: allTokenData[lc(collateral_token.address)].decimals,
        symbol: collateral_token.symbol,
      },
      borrowed: {
        decimals: allTokenData[lc(stablecoin_token.address)].decimals,
        symbol: stablecoin_token.symbol,
      },
    },
  }))
}, {
  promise: true,
});

export default getAllCrvusdMarkets;

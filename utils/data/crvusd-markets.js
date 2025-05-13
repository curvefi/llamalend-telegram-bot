import memoize from 'memoizee';
import { fetchPages } from '../Pagination.js';
import { flattenArray, uniq } from '../Array.js';
import getTokensData from './tokens-data.js';
import { lc } from '../String.js';

const CRVUSD_MARKETS_ADDRESS_ID_MAP = new Map([
  [lc('0x8472A9A7632b173c8Cf3a86D3afec50c35548e76'), 'sfrxeth'],
  [lc('0xEC0820EfafC41D8943EE8dE495fC9Ba8495B15cf'), 'sfrxeth2'],
  [lc('0x1C91da0223c763d2e0173243eAdaA0A2ea47E704'), 'tbtc'],
  [lc('0xA920De414eA4Ab66b97dA1bFE9e6EcA7d4219635'), 'eth'],
  [lc('0x4e59541306910aD6dC1daC0AC9dFB29bD9F15c67'), 'wbtc'],
  [lc('0x100dAa78fC509Db39Ef7D04DE0c1ABD299f4C6CE'), 'wsteth'],
]);

const getAllCrvusdMarkets = memoize(async () => {
  const crvusdMarkets = await fetchPages('https://prices.curve.finance/v1/crvusd/markets/ethereum', {
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
  }) => {
    const marketId = CRVUSD_MARKETS_ADDRESS_ID_MAP.get(lc(address));
    const externalUrl = typeof marketId === 'undefined' ? undefined : `https://www.curve.finance/crvusd/ethereum/markets/${marketId}/manage/loan`;

    return {
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
      externalUrl,
    };
  })
}, {
  promise: true,
});

export default getAllCrvusdMarkets;

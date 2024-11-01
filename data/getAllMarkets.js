import memoize from 'memoizee';
import getAllCrvusdMarkets from '../utils/data/crvusd-markets.js';
import getAllCurveLendingVaults from '../utils/data/curve-lending-vaults.js';

const getAllMarkets = memoize(async (network) => {
  const curveLendingVaults = await getAllCurveLendingVaults(network);
  const crvusdMarkets = network === 'ethereum' ? await getAllCrvusdMarkets() : [];

  return [
    ...curveLendingVaults.map((o) => ({ ...o, marketType: 'lend', network })),
    ...crvusdMarkets.map((o) => ({ ...o, marketType: 'crvusd', network })),
  ];
}, {
  promise: true,
});

export default getAllMarkets;

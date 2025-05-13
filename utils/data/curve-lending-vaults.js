import memoize from 'memoizee';

const getAllCurveLendingVaults = memoize(async (blockchainId) => (
  Array.from(Object.values((await (await fetch(`https://api.curve.finance/api/getLendingVaults/all/${blockchainId}`)).json()).data.lendingVaultData ?? {}))
    .map(({
      controllerAddress,
      ammAddress,
      address,
      assets,
      lendingVaultUrls,
    }) => ({
      // Return the explicit shape and data we need; must match the shape of utils/data/crvusd-markets.js
      controllerAddress,
      ammAddress,
      address,
      assets: {
        collateral: {
          decimals: assets.collateral.decimals,
          symbol: assets.collateral.symbol,
        },
        borrowed: {
          decimals: assets.borrowed.decimals,
          symbol: assets.borrowed.symbol,
        },
      },
      externalUrl: lendingVaultUrls.deposit?.replace('/vault/deposit', '/manage'),
    }))
), {
  promise: true,
});

export default getAllCurveLendingVaults;

import memoize from 'memoizee';

const getAllCurveLendingVaults = memoize(async (blockchainId) => (
  Array.from(Object.values((await (await fetch(`https://api.curve.fi/api/getLendingVaults/all/${blockchainId}`)).json()).data.lendingVaultData ?? {}))
), {
  promise: true,
});

export default getAllCurveLendingVaults;

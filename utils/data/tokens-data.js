import multiCall from '../../utils/Calls.js';
import { toLocalBN } from '../../utils/Parsing.js'
import { flattenArray, arrayToHashmap, uniq } from '../../utils/Array.js';
import { lc } from '../../utils/String.js';
import ERC20_ABI from '../../abis/ERC20.json' assert { type: 'json' };

const cache = new Map();

const fetchTokensData = async (tokenAddresses, network = 'ethereum') => {
  const tokenData = await multiCall(flattenArray(tokenAddresses.map((address) => [{
    address,
    abi: ERC20_ABI,
    methodName: 'symbol',
    metaData: {
      address,
      type: 'symbol',
    },
    network,
  }, {
    address,
    abi: ERC20_ABI,
    methodName: 'decimals',
    metaData: {
      address,
      type: 'decimals',
    },
    network,
  }])));

  const mergedTokenData = tokenData.reduce((accu, {
    data,
    metaData: { type, address },
  }) => {
    const key = address;
    const tokenInfo = accu[key];

    accu[key] = {
      ...tokenInfo,
      [type]: (
        type === 'decimals' ?
          toLocalBN(data).toNumber() :
          data
      ),
    };

    return accu;
  }, {});

  // Save to cache
  Array.from(Object.entries(mergedTokenData)).forEach(([address, data]) => {
    cache.set(`${network}-${address}`, {
      ...data,
      address, // Attach address to the coin's data
      network, // Attach network to the coin's data
    });
  });
};

const getTokensData = async (tokenAddresses, network = 'ethereum') => {
  if (tokenAddresses.length === 0) return {};

  const lcTokenAddresses = uniq(tokenAddresses.map(lc));
  const uncachedTokenAddresses = lcTokenAddresses.filter((address) => !cache.has(`${network}-${address}`));
  if (uncachedTokenAddresses.length > 0) await fetchTokensData(uncachedTokenAddresses, network);

  return arrayToHashmap(lcTokenAddresses.map((address) => [
    address,
    cache.get(`${network}-${address}`),
  ]));
};

export default getTokensData;

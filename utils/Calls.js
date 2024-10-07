import { ethers } from 'ethers';
import memoize from 'memoizee';
import { backOff } from 'exponential-backoff';
import MULTICALL_ABI from '../abis/Multicall3.json' assert { type: 'json' };
import {
  ZERO_ADDRESS,
  MULTICALL_CHUNKS_SIZE,
  MULTICALL_ADDRESS,
  ALL_NETWORK_IDS,
  NETWORK_CHAIN_ID_MAP,
  PROVIDER_INSTANCES,
} from '../constants/Web3.js';
import { IS_DEV } from '../constants/BotConstants.js';
import { flattenArray, getArrayChunks, arrayToHashmap, flatMap } from '../utils/Array.js';
import { toSignatureAwareMethodName } from '../utils/Web3/ethers.js';
import groupBy from 'lodash.groupby';

const FALLBACK_DECODED_PARAMETERS_VALUES = {
  uint8: '0',
  uint256: '0',
  'uint256[]': [],
  'uint256[2]': [],
  address: ZERO_ADDRESS,
  'address[]': [],
  'tuple[]': [],
  string: '',
};

// Contract instances cache store
const getReadContractInstance = memoize((address, abi, account, library, chainId) => (
  new ethers.Contract(address, abi, library)
), {
  max: 100,
});

// Contract instances cache store
const getWriteContractInstance = memoize((address, abi, account, library, chainId) => (
  new ethers.Contract(address, abi, library.getSigner())
), {
  max: 100,
});

// Interface instances cache store
const getInterfaceInstance = memoize((abi) => (
  new ethers.Interface(abi)
), {
  max: 100,
});

const defaultCallConfig = {
  address: undefined,
  abi: undefined,
  methodName: undefined, // e.g. 'claimable_tokens'
  params: [], // Array of params, if the method takes any
  // Optional; any data to be passed alongside each call's results, for example to act as a marker
  // to easily identify what the call's results reference
  metaData: undefined,
  network: 'ethereum',
  superConfig: {
    silenceErrorInDev: false,
    multicallChunkSize: undefined,
  },
  superSettings: {
    fallbackValue: undefined, // Custom fallback value for very specific cases; should rarely be used
  },
};

const getEncodedCalls = (callsConfig) => {
  if (callsConfig.length === 0) return { calls: [], augmentedCallsConfig: [] };

  const augmentedCallsConfig = callsConfig.map((config) => ({
    ...defaultCallConfig,
    ...config,
    superConfig: {
      ...defaultCallConfig.superConfig,
      ...(config.superConfig || {}),
    },
    superSettings: {
      ...defaultCallConfig.superSettings,
      ...(config.superSettings || {}),
    },
  }));

  // Validate configs
  for (const config of augmentedCallsConfig) {
    if (typeof config.address !== 'string') {
      console.error('Faulty call:', config);
      throw new Error('multiCall error: config parameter `address` expects a contract address (see faulty call above ↑)');
    }

    if (!Array.isArray(config.abi)) {
      throw new Error('multiCall error: config parameter `abi` expects an array');
    }

    if (typeof config.methodName !== 'string') {
      throw new Error('multiCall error: config parameter `methodName` expects a contract method name');
    }

    if (!ALL_NETWORK_IDS.includes(config.network)) {
      throw new Error(`multiCall error: config parameter \`network="${config.network}"\` isn’t a supported network`);
    }
  }

  const calls = augmentedCallsConfig.map(({
    address,
    abi,
    methodName,
    params,
  }) => {
    const itf = getInterfaceInstance(abi);

    const ethersMethodName = toSignatureAwareMethodName({
      methodName,
      abi,
      params,
    });

    return [
      address,
      itf.encodeFunctionData(ethersMethodName, params),
    ];
  });

  return { calls, augmentedCallsConfig };
};

const getDecodedData = ({ augmentedCallsConfig, returnData, hasMetaData = false }) => (
  returnData.map((hexData, i) => {
    const { abi, methodName, metaData, address, superConfig, superSettings } = augmentedCallsConfig[i];
    let outputSignature = abi.find(({ name }) => name === methodName).outputs;

    let data;

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    if (outputSignature.length > 1) {
      try {
        data = abiCoder.decode(outputSignature, hexData);
      } catch (err) {
        const failedDecodedTypes = outputSignature.map(({ type }) => type);
        const fallbackValues = failedDecodedTypes.map((failedDecodedType) => (
          FALLBACK_DECODED_PARAMETERS_VALUES[failedDecodedType]
        ));

        const hasFallbackValues = fallbackValues.every((fallbackValue) => typeof fallbackValue !== 'undefined');

        if ((IS_DEV && !superConfig.silenceErrorInDev) || !hasFallbackValues) {
          const messagePrefix = (IS_DEV && hasFallbackValues) ? '(Using fallback values) ' : '';
          console.error(`${messagePrefix}getDecodedData error: Failed decodeParameters with outputSignature ${JSON.stringify(outputSignature.map(({ type, name }) => ({ type, name })))}`);
          console.log('Failed call data:', { methodAbi: abi.find(({ name }) => name === methodName), methodName, metaData, address });
        }

        if (hasFallbackValues) {
          data = arrayToHashmap(flatMap(outputSignature, ({ type, name }, i) => [
            [i, fallbackValues[i]],
            [name, fallbackValues[i]],
          ]));
        } else {
          throw err;
        }
      }
    } else {
      try {
        data = abiCoder.decode(outputSignature, hexData);

        // In ethers v5, single return values are wrapped in an array, so we unwrap them
        if (outputSignature[0].type === 'tuple[]' && !!outputSignature[0].name) {
          data = data[outputSignature[0].name];
        } else {
          data = data[0];
        }
      } catch (err) {
        const failedDecodedType = outputSignature[0].type;

        // Use fallback value if one exists (ideally we have fallback values for all types,
        // add more when necessary as we encounter other failures)
        const hasFallbackValue = (
          typeof FALLBACK_DECODED_PARAMETERS_VALUES[failedDecodedType] !== 'undefined' ||
          typeof superSettings.fallbackValue !== 'undefined'
        );

        if ((IS_DEV && !superConfig.silenceErrorInDev) || !hasFallbackValue) {
          const messagePrefix = (IS_DEV && hasFallbackValue) ? '(Using fallback value) ' : '';
          console.error(`${messagePrefix}getDecodedData error: Failed decodeParameter with outputSignature ${JSON.stringify(failedDecodedType)}; hex data: ${JSON.stringify(hexData)}`);
          console.log('↑ Failed call data:', { methodAbi: abi.find(({ name }) => name === methodName), methodName, metaData, address });
        }

        // Allow passing a custom fallback value for very specific cases; should rarely be used
        if (typeof superSettings.fallbackValue !== 'undefined') {
          data = superSettings.fallbackValue;
          // Use fallback value if one exists (ideally we have fallback values for all types,
          // add more when necessary as we encounter other failures)
        } else if (typeof FALLBACK_DECODED_PARAMETERS_VALUES[failedDecodedType] !== 'undefined') {
          data = FALLBACK_DECODED_PARAMETERS_VALUES[failedDecodedType];
        } else {
          throw err;
        }
      }
    }

    if (hasMetaData) return { data, metaData };
    return data;
  })
);

/**
 * @param {Array<{address: String, abi: Array, methodName: String, params: Array}>} callsConfig
 *
 * Returns an array of data.
 * If `metaData` is passed alongside any call, returns an array of objects of shape { data, metaData } instead.
 */
const multiCall = async (callsConfig) => {
  if (callsConfig.length === 0) return [];

  const { calls, augmentedCallsConfig } = getEncodedCalls(callsConfig);
  const hasMetaData = augmentedCallsConfig.some(({ metaData }) => typeof metaData !== 'undefined');

  const { network, superConfig: { multicallChunkSize } } = augmentedCallsConfig[0];
  const account = '';
  const library = PROVIDER_INSTANCES[network];
  const chainId = NETWORK_CHAIN_ID_MAP[network][0]

  const multicallContract = getReadContractInstance(MULTICALL_ADDRESS, MULTICALL_ABI, account, library, chainId);
  const chunkedReturnData = [];
  const chunkedCalls = getArrayChunks(calls, (multicallChunkSize ?? MULTICALL_CHUNKS_SIZE[network] ?? MULTICALL_CHUNKS_SIZE.default)); // Keep each multicall size reasonable

  for (const callsChunk of chunkedCalls) {
    const aggregateReturnData = await backOff(() => multicallContract.tryAggregate.staticCall(false, callsChunk), {
      retry: (e, attemptNumber) => {
        console.log('multicall retrying!', {
          attemptNumber,
          // e,
          // augmentedCallsConfig,
        });
        return true;
      },
      numOfAttempts: 5,
      jitter: 'full',
    });
    const returnData = aggregateReturnData.map((data) => data.returnData);
    chunkedReturnData.push(returnData);
  }

  const returnData = flattenArray(chunkedReturnData);

  return getDecodedData({ augmentedCallsConfig, returnData, hasMetaData });
};

/**
 * Group multiCall results according to their metaData.groupKey value.
 * Useful for grouping large calls with different types of data in them:
 * `const { earned, claimed } = groupResults(await multiCall(…));`
 */
const groupResults = (multiCallResults) => groupBy(multiCallResults, 'metaData.groupKey');

export default multiCall;
export {
  getEncodedCalls,
  getDecodedData,
  getReadContractInstance,
  getWriteContractInstance,
  getInterfaceInstance,
  groupResults,
};

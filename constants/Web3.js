import { JsonRpcProvider } from 'ethers/providers';
import { arrayToHashmap, flattenArray } from '../utils/Array.js';
import { throwWhenAccessingUndefinedKey } from '../utils/Object.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

const BASE_URL_EXPLORER_ADDRESS_MAP = throwWhenAccessingUndefinedKey({
  ethereum: 'https://etherscan.io/address/',
  arbitrum: 'https://arbiscan.io/address/',
  optimism: 'https://optimistic.etherscan.io/address/',
  fraxtal: 'https://fraxscan.com/address/',
}, 'BASE_URL_EXPLORER_ADDRESS_MAP');

// Important: keep readme updated when new chains added!
const NETWORK_CHAIN_ID_MAP = throwWhenAccessingUndefinedKey({
  ethereum: [1, 1337],
  arbitrum: [42161],
  optimism: [10],
  fraxtal: [252],
}, 'NETWORK_CHAIN_ID_MAP');

const CHAIN_ID_NETWORK_MAP = throwWhenAccessingUndefinedKey((
  arrayToHashmap(flattenArray(Array.from(Object.entries(NETWORK_CHAIN_ID_MAP)).map(([network, chainIds]) => (
    chainIds.map((chainId) => [
      chainId,
      network,
    ])
  ))))
), 'CHAIN_ID_NETWORK_MAP');

// Also includes all available networks on Curve for pool display purposes
const NETWORK_NAMES_MAP = throwWhenAccessingUndefinedKey({
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum One',
  fraxtal: 'Fraxtal',
  optimism: 'Optimism',
}, 'NETWORK_NAMES_MAP');

const NETWORK_RPC_URL_MAP = throwWhenAccessingUndefinedKey({
  // ethereum: `https://lb.drpc.org/ogrpc?network=ethereum&dkey=${process.env.DRPC_KEY}`,
  ethereum: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  arbitrum: `https://lb.drpc.org/ogrpc?network=arbitrum&dkey=${process.env.DRPC_KEY}`,
  fraxtal: 'https://rpc.frax.com',
  optimism: `https://lb.drpc.org/ogrpc?network=optimism&dkey=${process.env.DRPC_KEY}`,
}, 'RPC_URLS_MAP');

const MULTICALL_CHUNKS_SIZE = {
  default: 150,
};

const ALL_NETWORK_IDS = Array.from(Object.keys(NETWORK_CHAIN_ID_MAP));
const ALL_CHAIN_IDS = flattenArray(Array.from(Object.values(NETWORK_CHAIN_ID_MAP)));

export class HttpHeadersJsonRpcProvider extends JsonRpcProvider {
  constructor(url, network) {
    super(url, network);
    this._lastResponseHeaders = null;
    this.aaurl = url;
  }

  _saveResponseHeaders(headers) {
    // Normalize Headers object -> plain object
    const result = {};
    for (const [k, v] of headers.entries()) result[k] = v;
    this._lastResponseHeaders = result;
  }

  getLastResponseHeaders() {
    return this._lastResponseHeaders;
  }

  // Override low-level send method used by JsonRpcProvider to perform the HTTP request.
  // ethers v6 JsonRpcProvider uses fetchRequest; ensure this override matches your ethers version.
  async send(method, params) {
    const url = this.aaurl;
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    // Save headers (Response.headers is a Headers instance)
    // this._saveResponseHeaders(res.headers);
    console.log('res.headers', res.headers)

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`HTTP error ${res.status}: ${text}`);
      err.status = res.status;
      throw err;
    }

    const json = await res.json();
    if (json.error) {
      const err = new Error(json.error.message || "RPC Error");
      err.code = json.error.code;
      err.data = json.error.data;
      throw err;
    }
    return json.result;
  }
}

const PROVIDER_INSTANCES = throwWhenAccessingUndefinedKey(arrayToHashmap(
  Object.entries(NETWORK_RPC_URL_MAP)
    .map(([networkId, networkRpcUrl]) => [networkId, (networkId === 'ethereum' ? new HttpHeadersJsonRpcProvider(networkRpcUrl) : new JsonRpcProvider(networkRpcUrl))])
));

export {
  ZERO_ADDRESS,
  MULTICALL_ADDRESS,
  BASE_URL_EXPLORER_ADDRESS_MAP,
  NETWORK_CHAIN_ID_MAP,
  CHAIN_ID_NETWORK_MAP,
  NETWORK_NAMES_MAP,
  NETWORK_RPC_URL_MAP,
  ALL_NETWORK_IDS,
  ALL_CHAIN_IDS,
  MULTICALL_CHUNKS_SIZE,
  PROVIDER_INSTANCES,
};

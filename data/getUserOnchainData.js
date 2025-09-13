import BN from 'bignumber.js';
import { arrayToHashmap, flattenArray, removeNulls } from '../utils/Array.js';
import LENDING_CONTROLLER_ABI from '../abis/LendingController.json' assert { type: 'json' };
import LENDING_AMM_ABI from '../abis/LendingAmm.json' assert { type: 'json' };
import multiCall from '../utils/Calls.js';
import groupBy from 'lodash.groupby';
import { uintToBN } from '../utils/Parsing.js';
import { escapeNumberForTg } from '../utils/String.js';
import { ALL_NETWORK_IDS } from '../constants/Web3.js';
import getAllMarkets from './getAllMarkets.js';
import { getTextPositionRepresentation } from '../utils/Bot.js';

const getUserLendingDataForNetwork = async (userAddresses, network) => {
  const allMarkets = await getAllMarkets(network);

  const userLendingData = await multiCall(flattenArray(flattenArray(
    allMarkets.map((lendingVault) => {
      const {
        controllerAddress,
        ammAddress,
        address: lendingVaultAddress,
      } = lendingVault;

      return (
        userAddresses.map((userAddress) => [{
          address: controllerAddress,
          abi: LENDING_CONTROLLER_ABI,
          methodName: 'loan_exists',
          params: [userAddress],
          metaData: { userAddress, lendingVaultAddress, type: 'doesLoanExist' },
          network,
        }, {
          address: controllerAddress,
          abi: LENDING_CONTROLLER_ABI,
          methodName: 'user_state',
          params: [userAddress],
          metaData: { userAddress, lendingVaultAddress, type: 'userState' },
          network,
        }, {
          address: controllerAddress,
          abi: LENDING_CONTROLLER_ABI,
          methodName: 'user_prices',
          params: [userAddress],
          metaData: { userAddress, lendingVaultAddress, type: 'priceRange' },
          network,
        }, {
          address: controllerAddress,
          abi: LENDING_CONTROLLER_ABI,
          methodName: 'health',
          params: [userAddress, true],
          metaData: { userAddress, lendingVaultAddress, type: 'health' },
          network,
        }, {
          address: ammAddress,
          abi: LENDING_AMM_ABI,
          methodName: 'read_user_tick_numbers',
          params: [userAddress],
          metaData: { userAddress, lendingVaultAddress, type: 'bandRange' },
          network,
        }, {
          address: ammAddress,
          abi: LENDING_AMM_ABI,
          methodName: 'active_band_with_skip',
          metaData: { userAddress, lendingVaultAddress, type: 'currentAmmBand' },
          network,
        }, {
          address: ammAddress,
          abi: LENDING_AMM_ABI,
          methodName: 'price_oracle',
          metaData: { userAddress, lendingVaultAddress, type: 'priceOracle' },
          network,
        }])
      );
    })
  )));

  const structuredLendingData = arrayToHashmap(
    Object.entries(groupBy(userLendingData, 'metaData.userAddress')).map(([userAddress, userData]) => [
      userAddress,
      arrayToHashmap(
        Object.entries(groupBy(userData, 'metaData.lendingVaultAddress')).map(([lendingVaultAddress, lendingVaultData]) => [
          `${network}-${lendingVaultAddress}`,
          arrayToHashmap(
            Object.entries(groupBy(lendingVaultData, 'metaData.type')).map(([dataType, [{ data, metaData }]]) => {
              const vaultData = allMarkets.find(({ address }) => address === metaData.lendingVaultAddress);

              return [
                dataType,
                (
                  dataType === 'health' ? uintToBN(data, 18).dp(6) :
                    dataType === 'bandRange' ? data.map((n) => Number(n)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) : // Always asc order
                      dataType === 'currentAmmBand' ? Number(data) :
                        dataType === 'priceRange' ? data.map((price, i) => uintToBN(price, 18).dp(6)) :
                          dataType === 'priceOracle' ? uintToBN(data, 18).dp(6) :
                            dataType === 'userState' ? {
                              atRiskCollat: uintToBN(data[0], vaultData.assets.collateral.decimals).dp(6),
                              atRiskBorrowed: uintToBN(data[1], vaultData.assets.borrowed.decimals).dp(6),
                              debt: uintToBN(data[2], vaultData.assets.borrowed.decimals).dp(6),
                              bandCount: Number(data[3]),
                            } :
                              data
                ),
              ];
            })
          ),
        ])
          .filter(([, { doesLoanExist }]) => doesLoanExist === true)
          .map(([lendingVaultKey, positionData]) => {
            const [network, lendingVaultAddress] = lendingVaultKey.split('-');
            const vaultData = allMarkets.find(({ address }) => address === lendingVaultAddress);
            const isInHardLiq = positionData.health.lt(0);
            const isInSoftLiq = (
              !isInHardLiq &&
              positionData.currentAmmBand >= positionData.bandRange[0] &&
              positionData.currentAmmBand <= positionData.bandRange[1]
            );

            const priceOracleDistFromRange = (
              (!isInSoftLiq && !isInHardLiq) ? (
                positionData.priceOracle.gte(BN.max(...positionData.priceRange)) ?
                  (positionData.priceOracle.minus(BN.max(...positionData.priceRange)).div(positionData.priceOracle)).times(100) :
                  undefined
              ) : undefined
            );

            const textLines = removeNulls([
              `State: *${isInHardLiq ? 'Hard Liquidation ⚠️' : isInSoftLiq ? 'Soft Liquidation ℹ️' : 'Healthy ✅'}*`,
              (isInHardLiq || isInSoftLiq || positionData.health.times(100).lte(2)) ? `Health: *${escapeNumberForTg(positionData.health.times(100).dp(4))}% ${isInHardLiq ? '⚠️' : 'ℹ️'}*` : null,
              (isInHardLiq || isInSoftLiq) ? `Currently at risk: *${escapeNumberForTg(positionData.userState.atRiskCollat.dp(4))} ${vaultData.assets.collateral.symbol} and ${escapeNumberForTg(positionData.userState.atRiskBorrowed.dp(4))} ${vaultData.assets.borrowed.symbol}*` : null,
              `Liquidation band range: ${escapeNumberForTg(positionData.bandRange[0])}→${escapeNumberForTg(positionData.bandRange[1])} \\(current AMM band: ${escapeNumberForTg(positionData.currentAmmBand)}\\)`,
              `Approx\\. liquidation price range:* ${escapeNumberForTg(positionData.priceRange[0].dp(2))}→${escapeNumberForTg(positionData.priceRange[1].dp(2))} *\\(current price: *${escapeNumberForTg(positionData.priceOracle.dp(2))}*${priceOracleDistFromRange !== undefined ? ` ≈ ${escapeNumberForTg(priceOracleDistFromRange.dp(2))}\\% away` : ''}\\)`,
            ]);

            console.log('text lines', positionData.priceOracle.dp(2), positionData.currentAmmBand)

            const textPositionRepresentation = getTextPositionRepresentation(vaultData, textLines);

            return [lendingVaultKey, {
              ...positionData,
              isInHardLiq,
              isInSoftLiq,
              vaultData,
              textPositionRepresentation,
            }];
          })
      ),
    ])
  );

  return structuredLendingData;
};

const getUserOnchainData = async (userAddresses) => (
  flattenArray(await Promise.all(ALL_NETWORK_IDS.map(async (network) => Object.entries(await getUserLendingDataForNetwork(userAddresses, network)))))
    .reduce((accu, [userAddress, positionData]) => {
      const userPositionData = accu[userAddress] ?? {};

      return {
        ...accu,
        [userAddress]: {
          ...userPositionData,
          ...positionData,
        },
      };
    }, {})
);

export default getUserOnchainData;

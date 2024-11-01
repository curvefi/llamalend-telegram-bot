import without from 'lodash.without';
import { DEFAULT_POSITION_OBJECT } from '../constants/PositionsConstants.js';
import getAllNewlyAddedAddresses from '../data/getAllNewlyAddedAddresses.js';
import getUserOnchainData from '../data/getUserOnchainData.js';
import getUsersData from '../data/getUsersData.js';
import saveUserPositionHealthChange from '../data/saveUserPositionHealthChange.js';
import updateUsersLastCheckedTs from '../data/updateUsersLastCheckedTs.js';
import { flattenArray, removeNulls, sum, uniq } from '../utils/Array.js';
import isMatureUserAddress from '../utils/data/is-mature-user-address.js';
import { bot, TELEGRAM_MESSAGE_OPTIONS } from '../utils/Telegraf.js';
import deleteUser from '../data/deleteUser.js';
import { getTextPositionRepresentation } from '../utils/Bot.js';
import getAllMarkets from '../data/getAllMarkets.js';

export const handler = async (event) => {
  const userIds = event.Records.map(({ body }) => JSON.parse(body).telegramUserId);
  if (userIds.length === 0) return;

  const uniqueUserIds = uniq(userIds);
  const deletedUserIds = [];

  const [
    usersData,
    allNewlyAddedAddresses,
    allMarkets,
  ] = await Promise.all([
    getUsersData(uniqueUserIds),
    getAllNewlyAddedAddresses(),
    getAllMarkets('ethereum'),
  ]);

  const safeUsersData = usersData.filter((o) => typeof o !== 'undefined');

  const allAddresses = uniq(flattenArray(safeUsersData.map(({ telegram_user_id, addresses }) => (
    Object.keys(addresses).filter((address) => isMatureUserAddress(telegram_user_id, address, allNewlyAddedAddresses))
  ))));

  const addressesOnchainData = await getUserOnchainData(allAddresses);

  for (const { telegram_user_id: telegramUserId, addresses } of safeUsersData) {
    const changedAddressesPositions = removeNulls(Object.entries(addresses).map(([address, positions]) => {
      // Don’t look at addresses that have already been filtered out of `allAddresses`
      if (!allAddresses.includes(address)) return null;

      const onchainPositions = Object.values(addressesOnchainData[address]);

      // This will not detect if user closed a position, but that's not the purpose of this bot
      const changedPositions = removeNulls(onchainPositions.map(({
        isInHardLiq,
        isInSoftLiq,
        textPositionRepresentation,
        vaultData,
      }) => {
        const prevPositionData = {
          ...DEFAULT_POSITION_OBJECT,
          ...(typeof positions[vaultData.address] !== 'undefined' ? {
            address: vaultData.address,
            last_checked_state: positions[vaultData.address],
          } : {})
        };
        const lastCheckedState = prevPositionData.last_checked_state;
        const currentState = (
          isInHardLiq ? 'HARD' :
            isInSoftLiq ? 'SOFT' :
              'HEALTHY'
        );

        if (
          currentState !== lastCheckedState &&
          !(currentState === 'HEALTHY' && lastCheckedState === 'CLOSED') // Akin to position being opened, which doens’t trigger a notification either
        ) {
          return {
            address: vaultData.address,
            currentState,
            textPositionRepresentation,
          };
        } else {
          return null;
        }
      }));

      const removedPositions = (
        Object.entries(positions)
          .filter(([vaultAddress, prevState]) => (
            prevState !== 'CLOSED' &&
            !onchainPositions.some(({ vaultData: { address } }) => address === vaultAddress)
          ))
          .map(([vaultAddress, prevState]) => {
            const vaultData = allMarkets.find(({ address }) => address === vaultAddress);

            const textLines = [
              `State: *Closed️* \\(previous state: ${prevState === 'HARD' ? 'Hard Liquidation ⚠️' : prevState === 'SOFT' ? 'Soft Liquidation ℹ️' : 'Healthy ✅'}\\)`,
            ];
            const textPositionRepresentation = getTextPositionRepresentation(vaultData, textLines);

            return {
              address: vaultAddress,
              currentState: 'CLOSED',
              textPositionRepresentation,
            };
          })
      );

      if (changedPositions.length === 0 && removedPositions.length === 0) return null;

      return {
        address,
        changedPositions: [...changedPositions, ...removedPositions],
      };
    }));

    if (changedAddressesPositions.length > 0) {
      const text = `
        *Health status change on ${sum(changedAddressesPositions.map(({ changedPositions }) => changedPositions.length))} of your positions:*
        ${changedAddressesPositions.map(({ address: userAddress, changedPositions }) => (`\n\\- On \`${userAddress}\`: ${Object.values(changedPositions).map(({ textPositionRepresentation }) => textPositionRepresentation)}
        `)).join("")}
      `;

      try {
        await bot.telegram.sendMessage(telegramUserId, text, TELEGRAM_MESSAGE_OPTIONS);
        await saveUserPositionHealthChange({ telegramUserId, changedAddressesPositions });
      } catch (err) {
        const isTelegramUserNotExistError = (
          err?.response?.ok === false &&
          err?.response?.error_code === 400 &&
          err?.response?.description === 'Bad Request: chat not found'
        );

        console.log('isTelegramUserNotExistError', isTelegramUserNotExistError)
        if (isTelegramUserNotExistError) {
          await deleteUser({ telegramUserId });
          deletedUserIds.push(telegramUserId);

          console.log(`Deleted user ${telegramUserId}: sending Telegram message failed with "${err?.response?.description}", which means user cannot be reached anymore, hence no point to keep monitoring their addresses`);
        } else {
          throw err;
        }
      }
    }
  }

  const userIdsWithoutDeletedOnes = without(uniqueUserIds, ...deletedUserIds);
  if (userIdsWithoutDeletedOnes.length > 0) {
    await updateUsersLastCheckedTs(userIdsWithoutDeletedOnes);
  }
}

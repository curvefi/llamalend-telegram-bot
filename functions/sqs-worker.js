import { DEFAULT_POSITION_OBJECT } from '../constants/PositionsConstants.js';
import getAllNewlyAddedAddresses from '../data/getAllNewlyAddedAddresses.js';
import getUserOnchainData from '../data/getUserOnchainData.js';
import getUsersData from '../data/getUsersData.js';
import saveUserPositionHealthChange from '../data/saveUserPositionHealthChange.js';
import updateUsersLastCheckedTs from '../data/updateUsersLastCheckedTs.js';
import { flattenArray, removeNulls, sum, uniq } from '../utils/Array.js';
import isMatureUserAddress from '../utils/data/is-mature-user-address.js';
import { bot, TELEGRAM_MESSAGE_OPTIONS } from '../utils/Telegraf.js';

export const handler = async (event) => {
  const userIds = event.Records.map(({ body }) => JSON.parse(body).telegramUserId);
  if (userIds.length === 0) return;

  const uniqueUserIds = uniq(userIds);

  const [
    usersData,
    allNewlyAddedAddresses,
  ] = await Promise.all([
    getUsersData(uniqueUserIds),
    getAllNewlyAddedAddresses(),
  ]);

  const allAddresses = uniq(flattenArray(usersData.map(({ telegram_user_id, addresses }) => (
    Object.keys(addresses).filter((address) => isMatureUserAddress(telegram_user_id, address, allNewlyAddedAddresses))
  ))));

  const addressesOnchainData = await getUserOnchainData(allAddresses);

  for (const { telegram_user_id: telegramUserId, addresses } of usersData) {
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

        if (currentState !== lastCheckedState) {
          return {
            address: vaultData.address,
            currentState,
            textPositionRepresentation,
          };
        } else {
          return null;
        }
      }));

      if (changedPositions.length === 0) return null;

      return { address, changedPositions };
    }));

    if (changedAddressesPositions.length > 0) {
      const text = `
        *Health status change on ${sum(changedAddressesPositions.map(({ changedPositions }) => changedPositions.length))} of your positions:*
        ${changedAddressesPositions.map(({ address: userAddress, changedPositions }) => (`\n\\- On \`${userAddress}\`: ${Object.values(changedPositions).map(({ textPositionRepresentation }) => textPositionRepresentation)}
        `)).join("")}
      `;
      bot.telegram.sendMessage(telegramUserId, text, TELEGRAM_MESSAGE_OPTIONS);

      await saveUserPositionHealthChange({ telegramUserId, changedAddressesPositions });
    }
  }

  await updateUsersLastCheckedTs(uniqueUserIds);
}

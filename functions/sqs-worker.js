import { DEFAULT_POSITION_OBJECT, POSITION_HEALTH_STATUS } from '../constants/PositionsConstants.js';
import getUserOnchainData from '../data/getUserOnchainData.js';
import getUsersData from '../data/getUsersData.js';
import saveUserPositionHealthChange from '../data/saveUserPositionHealthChange.js';
import updateUsersLastCheckedTs from '../data/updateUsersLastCheckedTs.js';
// import saveUserAddresses from '../data/saveUserAddresses.js';
import { flattenArray, removeNulls, sum, uniq } from '../utils/Array.js';
import { bot, TELEGRAM_MESSAGE_OPTIONS } from '../utils/Telegraf.js';

export const handler = async (event) => {
  const userIds = event.Records.map(({ body }) => JSON.parse(body).telegramUserId);
  if (userIds.length === 0) return;
  console.log('userIds', userIds)

  const uniqueUserIds = uniq(userIds);
  const usersData = await getUsersData(uniqueUserIds);

  console.log('usersData', usersData)
  const allAddresses = uniq(flattenArray(usersData.map(({ addresses }) => Object.keys(addresses))));
  console.log('allAddresses', allAddresses)

  const addressesOnchainData = await getUserOnchainData(allAddresses);
  // console.log('addressesOnchainData', addressesOnchainData)

  for (const { telegram_user_id: telegramUserId, addresses } of usersData) {
    const changedAddressesPositions = removeNulls(Object.entries(addresses).map(([address, positions]) => {
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
        // console.log('prevPositionData', prevPositionData);
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
    console.log('changedAddressesPositions', changedAddressesPositions)

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

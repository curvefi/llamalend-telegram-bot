import getUserOnchainData from '../data/getUserOnchainData.js';
import saveUserPositionHealthChange from '../data/saveUserPositionHealthChange.js';
import { shortAddress } from '../utils/String.js';
import { bot, TELEGRAM_MESSAGE_OPTIONS } from '../utils/Telegraf.js';

export const handler = async (event) => {
  const { telegramUserId, newAddress } = JSON.parse(event.Records[0].Sns.Message);

  const { [newAddress]: addressOnchainData } = await getUserOnchainData([newAddress]);
  const onchainPositions = Object.values(addressOnchainData);

  const foundPositions = onchainPositions.map(({
    isInHardLiq,
    isInSoftLiq,
    textPositionRepresentation,
    vaultData,
    health,
  }) => {
    const currentState = (
      isInHardLiq ? 'HARD' :
        isInSoftLiq ? 'SOFT' :
          'HEALTHY'
    );

    const currentHealth = health.times(100);

    return {
      address: vaultData.address,
      network: vaultData.network,
      currentState,
      currentHealth,
      textPositionRepresentation,
    };
  });

  await saveUserPositionHealthChange({
    telegramUserId,
    changedAddressesPositions: [{
      address: newAddress,
      changedPositions: foundPositions,
    }],
  });

  const unhealthyPositions = foundPositions.filter(({
    currentState,
    currentHealth,
  }) => (
    currentState !== 'HEALTHY' ||
    currentHealth.lte(2)
  ));
  if (unhealthyPositions.length > 0) {
    const text = `
      *Found ${unhealthyPositions.length > 1 ? 'positions' : 'position'} with a health status deserving your attention on the address you’ve just started monitoring \\(\`${shortAddress(newAddress)}\`\\):*
      ${Object.values(unhealthyPositions).map(({ textPositionRepresentation }) => textPositionRepresentation)}
      `;
    await bot.telegram.sendMessage(telegramUserId, text, TELEGRAM_MESSAGE_OPTIONS);
  }
};

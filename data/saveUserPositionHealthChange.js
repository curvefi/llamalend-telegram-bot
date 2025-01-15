import { UserEntity, UserHealthEntity } from '../utils/DynamoDbTools.js';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { arrayToHashmap } from '../utils/Array.js';

const saveUserPositionHealthChange = async ({
  telegramUserId,
  changedAddressesPositions,
}) => {
  const itemdesc = {
    telegram_user_id: telegramUserId,
    addresses: arrayToHashmap(changedAddressesPositions.map(({
      address,
      changedPositions,
    }) => [
        address,
        arrayToHashmap(changedPositions.map(({
          currentState,
          address: positionAddress,
          network: positionNetwork,
        }) => [
            `${positionNetwork}-${positionAddress}`,
            currentState,
          ])),
      ])),
  };

  const healthitemdesc = {
    telegram_user_id: telegramUserId,
    addresses: arrayToHashmap(changedAddressesPositions.map(({
      address,
      changedPositions,
    }) => [
        address,
        arrayToHashmap(changedPositions.map(({
          currentHealth,
          address: positionAddress,
          network: positionNetwork,
        }) => [
            `${positionNetwork}-${positionAddress}`,
            currentHealth.dp(4).toNumber(),
          ])),
      ])),
  };

  await Promise.all([
    UserEntity.build(UpdateItemCommand)
      .item(itemdesc)
      .send(),
    UserHealthEntity.build(UpdateItemCommand)
      .item(healthitemdesc)
      .send(),
  ]);
};

export default saveUserPositionHealthChange;

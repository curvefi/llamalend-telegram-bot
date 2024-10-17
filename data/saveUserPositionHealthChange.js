import { UserEntity } from '../utils/DynamoDbTools.js';
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
        }) => [
            positionAddress,
            currentState,
          ])),
      ])),
  };

  await UserEntity.build(UpdateItemCommand)
    .item(itemdesc)
    .send();
};

export default saveUserPositionHealthChange;

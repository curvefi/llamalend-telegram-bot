import { DEFAULT_ADDRESS_OBJECT } from '../constants/PositionsConstants.js';
import { lc } from '../utils/String.js';
import { UserEntity } from '../utils/DynamoDbTools.js';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';

const createUserWithAddress = async ({
  telegramUserId,
  newAddress,
}) => {
  const addresses = {
    [lc(newAddress)]: {},
  };

  await UserEntity.build(PutItemCommand)
    .item({
      telegram_user_id: telegramUserId,
      addresses,
    })
    .send();

  return addresses;
};

export default createUserWithAddress;

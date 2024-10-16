import { lc } from '../utils/String.js';
import { NewlyAddedAddressEntity, UserEntity, userIdAndAddressKeyFormatter } from '../utils/DynamoDbTools.js';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { getNowTimestamp } from '../utils/Date.js';

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

  await NewlyAddedAddressEntity.build(PutItemCommand)
    .item({
      user_id_and_address: userIdAndAddressKeyFormatter(telegramUserId, newAddress),
      added_ts: getNowTimestamp(),
    })
    .send();

  return addresses;
};

export default createUserWithAddress;

import { lc } from '../utils/String.js';
import { NewlyAddedAddressEntity, UserEntity, UserHealthEntity, userIdAndAddressKeyFormatter } from '../utils/DynamoDbTools.js';
import { UpdateItemCommand, $set } from 'dynamodb-toolbox/entity/actions/update';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { getNowTimestamp } from '../utils/Date.js';

const addUserAddress = async ({
  telegramUserId,
  newAddress,
}) => {
  const { Attributes: { addresses: updatedAddresses } } = await UserEntity.build(UpdateItemCommand)
    .item({
      telegram_user_id: telegramUserId,
      addresses: {
        [lc(newAddress)]: $set({}),
      },
    })
    .options({ returnValues: 'ALL_NEW' })
    .send();

  await UserHealthEntity.build(UpdateItemCommand)
    .item({
      telegram_user_id: telegramUserId,
      addresses: {
        [lc(newAddress)]: $set({}),
      },
    })
    .send();

  await NewlyAddedAddressEntity.build(PutItemCommand)
    .item({
      user_id_and_address: userIdAndAddressKeyFormatter(telegramUserId, newAddress),
      added_ts: getNowTimestamp(),
    })
    .send();

  return updatedAddresses;
};

export default addUserAddress;

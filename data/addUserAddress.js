import { DEFAULT_ADDRESS_OBJECT, POSITION_HEALTH_STATUS } from '../constants/PositionsConstants.js';
import { lc } from '../utils/String.js';
import { UserEntity } from '../utils/DynamoDbTools.js';
import { UpdateItemCommand, $append, $set } from 'dynamodb-toolbox/entity/actions/update'

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

  return updatedAddresses;
};

export default addUserAddress;

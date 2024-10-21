import { UserEntity } from '../utils/DynamoDbTools.js';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';

const getUserData = async (telegramUserId) => {
  const { Item } = await UserEntity.build(GetItemCommand)
    .key({ telegram_user_id: telegramUserId })
    .send();

  const userData = {
    addresses: Item?.addresses ?? {},
    last_checked_ts: Item?.last_checked_ts ?? 0,
  };

  return userData;
};

export default getUserData;

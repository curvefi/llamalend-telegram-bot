import { UserEntity } from '../utils/DynamoDbTools.js';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';

const getUserData = async (telegramUserId) => {
  const { Item } = await UserEntity.build(GetItemCommand)
    .key({ telegram_user_id: telegramUserId })
    .send();

  const userData = Item?.addresses ?? {};

  return userData;
};

export default getUserData;

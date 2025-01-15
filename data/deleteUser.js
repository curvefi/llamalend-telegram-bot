import { UserEntity, UserHealthEntity } from '../utils/DynamoDbTools.js';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

const deleteUser = async ({
  telegramUserId,
}) => {
  await UserEntity.build(DeleteItemCommand)
    .key({ telegram_user_id: telegramUserId })
    .send();

  await UserHealthEntity.build(DeleteItemCommand)
    .key({ telegram_user_id: telegramUserId })
    .send();
};

export default deleteUser;

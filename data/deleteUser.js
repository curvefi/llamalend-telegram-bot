import { DEFAULT_ADDRESS_OBJECT } from '../constants/PositionsConstants.js';
import { lc } from '../utils/String.js';
import { UserEntity } from '../utils/DynamoDbTools.js';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

const deleteUser = async ({
  telegramUserId,
}) => {
  await UserEntity.build(DeleteItemCommand)
    .key({ telegram_user_id: telegramUserId })
    .send();
};

export default deleteUser;

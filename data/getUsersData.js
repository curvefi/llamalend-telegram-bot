import { UserEntity, WatchedAddressesTable } from '../utils/DynamoDbTools.js';
import { BatchGetRequest } from 'dynamodb-toolbox/entity/actions/batchGet';
import {
  BatchGetCommand,
  execute
} from 'dynamodb-toolbox/table/actions/batchGet';

const getUsersData = async (telegramUserIds) => {
  const { Responses: [usersData] } = await execute(WatchedAddressesTable.build(BatchGetCommand).requests(
    ...telegramUserIds.map((telegramUserId) => (
      UserEntity.build(BatchGetRequest).key({ telegram_user_id: telegramUserId })
    ))
  ));

  return usersData;
};

export default getUsersData;

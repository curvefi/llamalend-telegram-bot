import { UserEntity } from '../utils/DynamoDbTools.js';
import { execute } from 'dynamodb-toolbox/entity/actions/transactWrite';
import { UpdateTransaction } from 'dynamodb-toolbox/entity/actions/transactUpdate';
import { getNowTimestamp } from '../utils/Date.js';

const updateUsersLastCheckedTs = async (userIds) => {
  await execute(
    ...userIds.map((telegramUserId) => (
      UserEntity.build(UpdateTransaction).item({
        telegram_user_id: telegramUserId,
        last_checked_ts: getNowTimestamp(),
      })
    ))
  );
};

export default updateUsersLastCheckedTs;

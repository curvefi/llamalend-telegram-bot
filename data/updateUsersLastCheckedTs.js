import { UserEntity } from '../utils/DynamoDbTools.js';
import { execute } from 'dynamodb-toolbox/entity/actions/transactWrite';
import { UpdateTransaction } from 'dynamodb-toolbox/entity/actions/transactUpdate';
import { getNowTimestamp } from '../utils/Date.js';

/**
 * Note: this method is only called from a SQS worker, which itself is only called
 * with batches of max 100 items. `transactWrite` has a limit of 100 items, so this
 * works out nicely.
 */
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

import { lc } from '../utils/String.js';
import { UserEntity, UserHealthEntity } from '../utils/DynamoDbTools.js';
import { UpdateItemCommand, $remove } from 'dynamodb-toolbox/entity/actions/update';

/**
 * Note: the removal of a list item using an index retrieved from an earlier getItem
 * action is prone to race conditions (if the index changes in between the retrieval
 * and the removal, the wrong item will be removed). A ConditionCheck is generally used
 * to avoid that race condition. However in the context of a Telegram bot where addresses
 * are per-user and a single user will not interact with the bot rapidly enough to trigger
 * such a race condition, such a ConditionCheck is deemed unnecessary.
 */
const removeUserAddress = async ({
  telegramUserId,
  removedAddress,
}) => {
  const { Attributes: { addresses: updatedAddresses } } = await UserEntity.build(UpdateItemCommand)
    .item({
      telegram_user_id: telegramUserId,
      addresses: {
        [lc(removedAddress)]: $remove(),
      },
    })
    .options({ returnValues: 'ALL_NEW' })
    .send();

  await UserHealthEntity.build(UpdateItemCommand)
    .item({
      telegram_user_id: telegramUserId,
      addresses: {
        [lc(removedAddress)]: $remove(),
      },
    })
    .send();

  return updatedAddresses;
};

export default removeUserAddress;

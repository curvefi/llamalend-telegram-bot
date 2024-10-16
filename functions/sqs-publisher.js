import getAllUserData from '../data/getAllUserData.js';
import sqs from '../utils/SqsInstance.js';
import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { getNowTimestamp } from '../utils/Date.js';
import { sequentialPromiseMap } from '../utils/Async.js';
import getAllNewlyAddedAddresses from '../data/getAllNewlyAddedAddresses.js';
import isMatureUserAddress from '../utils/data/is-mature-user-address.js';

const STALE_DELAY = 4 * 60;

export const handler = async (event, context) => {
  console.log('publisher event')
  const nowTs = getNowTimestamp();

  const [
    allUserData,
    allNewlyAddedAddresses,
  ] = await Promise.all([
    getAllUserData(),
    getAllNewlyAddedAddresses(),
  ]);

  const allUsersToCheck = allUserData.filter(({ telegram_user_id, last_checked_ts, addresses }) => {
    const wasNotCheckedRecentlyAlready = nowTs > (last_checked_ts + STALE_DELAY);
    const hasAddressesToCheck = Object.keys(addresses).length > 0;
    const hasMatureAddresses = Object.keys(addresses).some((address) => isMatureUserAddress(telegram_user_id, address, allNewlyAddedAddresses));

    return (
      wasNotCheckedRecentlyAlready &&
      hasAddressesToCheck &&
      hasMatureAddresses
    );
  }).map(({ telegram_user_id }) => telegram_user_id);

  console.log('allUsersToCheck', allUsersToCheck)

  await sequentialPromiseMap(allUsersToCheck, async (userIdsChunk) => (
    sqs.send(new SendMessageBatchCommand({
      QueueUrl: process.env.SQS_URL,
      Entries: userIdsChunk.map((telegramUserId) => ({
        Id: String(telegramUserId),
        MessageBody: JSON.stringify({
          telegramUserId,
        }),
      }))
    }))
  ), 10); // SendMessageBatchCommand can take at most 10 entries
};

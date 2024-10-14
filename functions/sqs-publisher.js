import getAllUserData from '../data/getAllUserData.js';
import sqs from '../utils/SqsInstance.js';
import { getNowTimestamp } from '../utils/Date.js';
import { sequentialPromiseMap } from '../utils/Async.js';
import { flattenArray } from '../utils/Array.js';

const STALE_DELAY = 4 * 60;

export const handler = async (event, context) => {
  console.log('publisher event')
  const nowTs = getNowTimestamp();

  const allUserData = await getAllUserData();
  const allUsersToCheck = allUserData.filter(({ last_checked_ts, addresses }) => (
    nowTs > (last_checked_ts + STALE_DELAY) &&
    Object.keys(addresses).length > 0
  )).map(({ telegram_user_id }) => telegram_user_id);

  console.log('allUsersToCheck', allUsersToCheck)

  await sequentialPromiseMap(allUsersToCheck, async (userIdsChunk) => (
    sqs.sendMessageBatch({
      QueueUrl: process.env.SQS_URL,
      Entries: userIdsChunk.map((telegramUserId) => ({
        Id: String(telegramUserId),
        MessageBody: JSON.stringify({
          telegramUserId,
        }),
      }))
    }).promise()
  ), 10); // sendMessageBatch can take at most 10 entries
};

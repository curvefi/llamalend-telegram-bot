import dynamodb from '../utils/DynamoDbInstance.js';

const saveUserAddresses = async (telegramUserId, updatedAddresses) => (
  dynamodb.put({
    TableName: 'WatchedAddresses',
    Item: {
      telegram_user_id: telegramUserId,
      addresses: updatedAddresses,
    },
  }).promise()
);

export default saveUserAddresses;

import dynamodb from '../utils/DynamoDbInstance.js';

const getUserAddresses = async (telegramUserId) => {
  const result = await dynamodb.get({
    TableName: 'WatchedAddresses',
    Key: { telegram_user_id: telegramUserId },
  }).promise();

  const userAddresses = result?.Item?.addresses ?? [];

  return userAddresses;
};

export default getUserAddresses;

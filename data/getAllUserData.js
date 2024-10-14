import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import { WatchedAddressesTable } from '../utils/DynamoDbTools.js';

const getAllUserData = async () => {
  const allUserData = [];
  const command = WatchedAddressesTable.build(ScanCommand);
  let lastEvaluatedKey;

  do {
    const result = await command
      .options({ exclusiveStartKey: lastEvaluatedKey, limit: 1 })
      .send();

    lastEvaluatedKey = result.LastEvaluatedKey; // Only defined in response if scan() didn't retrieve the whole set
    allUserData.push(...result.Items);
  } while (typeof lastEvaluatedKey !== 'undefined');

  return allUserData;
};

export default getAllUserData;

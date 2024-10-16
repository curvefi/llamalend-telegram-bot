import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import { NewlyAddedAddressesTable } from '../utils/DynamoDbTools.js';

const getAllNewlyAddedAddresses = async () => {
  const allNewlyAddedAddresses = [];
  const command = NewlyAddedAddressesTable.build(ScanCommand);
  let lastEvaluatedKey;

  do {
    const result = await command
      .options({ exclusiveStartKey: lastEvaluatedKey, limit: 1 })
      .send();

    lastEvaluatedKey = result.LastEvaluatedKey; // Only defined in response if scan() didn't retrieve the whole set
    allNewlyAddedAddresses.push(...result.Items);
  } while (typeof lastEvaluatedKey !== 'undefined');

  return allNewlyAddedAddresses;
};

export default getAllNewlyAddedAddresses;

import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import documentClient from '../utils/DynamoDbInstance.js';
import { NewlyAddedAddressesTable, WatchedAddressesTable } from '../utils/DynamoDbTools.js';

const getTablesItemsCounts = async () => {
  const [
    watchedAddressesTable,
    newlyAddedAddressesTable,
  ] = await Promise.all([
    WatchedAddressesTable,
    NewlyAddedAddressesTable,
  ].map(async (table) => {
    const command = new DescribeTableCommand({
      TableName: table.name,
    });
    const { Table: { ItemCount } } = await documentClient.send(command);

    return ItemCount;
  }));

  return {
    WatchedAddressesTable: watchedAddressesTable,
    NewlyAddedAddressesTable: newlyAddedAddressesTable,
  };
};

export default getTablesItemsCounts;

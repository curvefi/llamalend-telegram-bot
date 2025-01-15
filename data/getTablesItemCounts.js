import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import documentClient from '../utils/DynamoDbInstance.js';
import { NewlyAddedAddressesTable, WatchedAddressesTable, WatchedAddressesHealthTable } from '../utils/DynamoDbTools.js';

const getTablesItemsCounts = async () => {
  const [
    watchedAddressesTable,
    watchedAddressesHealthTable,
    newlyAddedAddressesTable,
  ] = await Promise.all([
    WatchedAddressesTable,
    WatchedAddressesHealthTable,
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
    WatchedAddressesHealthTable: watchedAddressesHealthTable,
    NewlyAddedAddressesTable: newlyAddedAddressesTable,
  };
};

export default getTablesItemsCounts;

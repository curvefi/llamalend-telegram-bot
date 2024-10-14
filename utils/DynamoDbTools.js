import documentClient from './DynamoDbInstance.js';
import { Table } from 'dynamodb-toolbox/table';
import { Entity } from 'dynamodb-toolbox/entity';
import { schema } from 'dynamodb-toolbox/schema';
import { string } from 'dynamodb-toolbox/attributes/string';
import { number } from 'dynamodb-toolbox/attributes/number';
import { list } from 'dynamodb-toolbox/attributes/list';
import { map } from 'dynamodb-toolbox/attributes/map';
import { record } from 'dynamodb-toolbox/attributes/record'
import { POSITION_HEALTH_STATUS } from '../constants/PositionsConstants.js';

const WatchedAddressesTable = new Table({
  documentClient,
  name: 'WatchedAddresses',
  partitionKey: {
    name: 'telegram_user_id',
    type: 'number',
  },
});

const USER_ENTITY_SCHEMA = schema({
  telegram_user_id: number().key(),
  last_checked_ts: number().default(0),
  addresses: record(
    string(), // User address
    record(
      string(), // Position address (lending market or crvUSD vault)
      string().enum(...Object.keys(POSITION_HEALTH_STATUS))
    )
  ),
});

const UserEntity = new Entity({
  name: 'User',
  table: WatchedAddressesTable,
  schema: USER_ENTITY_SCHEMA,
  timestamps: false,
});

export {
  WatchedAddressesTable,
  UserEntity,
};

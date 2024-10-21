import documentClient from './DynamoDbInstance.js';
import { Table } from 'dynamodb-toolbox/table';
import { Entity } from 'dynamodb-toolbox/entity';
import { schema } from 'dynamodb-toolbox/schema';
import { string } from 'dynamodb-toolbox/attributes/string';
import { number } from 'dynamodb-toolbox/attributes/number';
import { record } from 'dynamodb-toolbox/attributes/record';
import { POSITION_HEALTH_STATUS } from '../constants/PositionsConstants.js';
import { lc } from './String.js';

const WatchedAddressesTable = new Table({
  documentClient,
  name: `${process.env.SLS_STAGE}-WatchedAddresses`,
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

const NewlyAddedAddressesTable = new Table({
  documentClient,
  name: `${process.env.SLS_STAGE}-NewlyAddedAddresses`,
  partitionKey: {
    name: 'user_id_and_address',
    type: 'string',
  },
});

const NEWLY_ADDED_ADDRESS_ENTITY_SCHEMA = schema({
  user_id_and_address: string().key(),
  added_ts: number(),
});

const NewlyAddedAddressEntity = new Entity({
  name: 'NewlyAddedAddress',
  table: NewlyAddedAddressesTable,
  schema: NEWLY_ADDED_ADDRESS_ENTITY_SCHEMA,
  timestamps: false,
});

const userIdAndAddressKeyFormatter = (userId, address) => lc(`${userId}-${address}`);

export {
  WatchedAddressesTable,
  UserEntity,
  NewlyAddedAddressesTable,
  NewlyAddedAddressEntity,
  userIdAndAddressKeyFormatter,
};

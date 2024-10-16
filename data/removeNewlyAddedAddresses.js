import { NewlyAddedAddressEntity } from '../utils/DynamoDbTools.js';
import { execute } from 'dynamodb-toolbox/entity/actions/transactWrite';
import { DeleteTransaction } from 'dynamodb-toolbox/entity/actions/transactDelete';
import { getArrayChunks } from '../utils/Array.js';

const removeNewlyAddedAddresses = async (keys) => {
  // `transactWrite` has a limit of 100 items
  const keysChunks = getArrayChunks(keys, 100);

  for (const keysChunk of keysChunks) {
    await execute(
      ...keysChunk.map((key) => (
        NewlyAddedAddressEntity.build(DeleteTransaction).key({
          user_id_and_address: key,
        })
      ))
    );
  }
};

export default removeNewlyAddedAddresses;

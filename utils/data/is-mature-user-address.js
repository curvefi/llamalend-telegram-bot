import { getNowTimestamp } from '../Date.js';
import { userIdAndAddressKeyFormatter } from '../DynamoDbTools.js';

const isMatureAddressCheck = (ts) => getNowTimestamp() > (ts + 5 * 60);

/**
 * Checks that user has addresses that have been added for at least 5 minutes.
 * This translates to them either not being in the "newly added addresses" table, or
 * being there but with a timestamp that attests they’ve been there long enough.
 * Since addresses are checked right when they’re added, this prevents duplicate work & notifications.
 *
 * `allNewlyAddedAddresses` is the result of `await getAllNewlyAddedAddresses()`
 */
const isMatureUserAddress = (userId, address, allNewlyAddedAddresses) => {
  const newlyAddedData = allNewlyAddedAddresses.find(({ user_id_and_address }) => (
    user_id_and_address === userIdAndAddressKeyFormatter(userId, address)
  ));

  return (
    typeof newlyAddedData === 'undefined' ||
    isMatureAddressCheck(newlyAddedData.added_ts)
  );
}

export default isMatureUserAddress;
export { isMatureAddressCheck };

import getAllNewlyAddedAddresses from '../data/getAllNewlyAddedAddresses.js';
import { isMatureAddressCheck } from '../utils/data/is-mature-user-address.js';
import removeNewlyAddedAddresses from '../data/removeNewlyAddedAddresses.js';

export const handler = async () => {
  const allNewlyAddedAddresses = await getAllNewlyAddedAddresses();
  const recordsToDelete = allNewlyAddedAddresses.filter(({ added_ts }) => isMatureAddressCheck(added_ts));

  await removeNewlyAddedAddresses(recordsToDelete.map(({ user_id_and_address }) => user_id_and_address));
};

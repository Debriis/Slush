import { ApiError } from '../../utils/errors.js';
export const capabilities = Object.freeze({
  automaticSync: false,
  ownershipVerification: false,
  importSupported: true,
  message:
    'Automatic access requires LeetCode authorization. Imports are self-reported and earn no XP.',
});
// Deliberately no network access or environment switch until permission is established.
export async function fetchActivity() {
  throw new ApiError(409, capabilities.message);
}

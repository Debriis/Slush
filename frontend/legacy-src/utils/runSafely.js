/** Consume rejected platform operations without exposing their internal error details. */
export async function runSafely(operation, onFailure = () => {}) {
  try {
    await operation();
    return true;
  } catch {
    onFailure();
    return false;
  }
}

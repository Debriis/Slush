import { ApiError } from '../utils/errors.js';
export function authentication(supabase) {
  return async (req, _res, next) => {
    try {
      const header = req.get('authorization');
      if (!header?.startsWith('Bearer ') || header.length > 10000)
        throw new ApiError(401, 'Please sign in to continue.');
      // getUser verifies the token with Supabase Auth; decoding a JWT alone is never trusted.
      const { data, error } = await supabase.auth.getUser(header.slice(7));
      if (error || !data?.user)
        throw new ApiError(401, 'Your session expired. Please sign in again.');
      req.user = data.user;
      next();
    } catch (error) {
      next(
        error instanceof ApiError
          ? error
          : new ApiError(503, 'Authentication is temporarily unavailable.'),
      );
    }
  };
}

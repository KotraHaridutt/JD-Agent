export const MOCK_RATE_LIMIT_SUCCESS = {
  success: true,
  limit: 10,
  remaining: 9,
  reset: Date.now() + 60000
};

export const MOCK_RATE_LIMIT_EXCEEDED = {
  success: false,
  limit: 10,
  remaining: 0,
  reset: Date.now() + 30000
};

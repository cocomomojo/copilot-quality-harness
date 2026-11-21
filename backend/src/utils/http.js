export function asyncRoute(logLabel, errorMessage, handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error(`${logLabel}:`, error);
      res.status(500).json({ error: errorMessage });
    }
  };
}

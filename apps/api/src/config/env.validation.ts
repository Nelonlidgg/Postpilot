
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const requiredVariables = [
    'DATABASE_URL',
    'FRONTEND_URL',
    'API_PORT',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_SECRET',
  ];

  for (const variable of requiredVariables) {
    const value = config[variable];

    if (
      typeof value !== 'string' ||
      value.trim() === ''
    ) {
      throw new Error(
        `Missing required environment variable: ${variable}`,
      );
    }
  }

  const apiPort = Number(config.API_PORT);
  const redisPort = Number(config.REDIS_PORT);

  for (const port of [apiPort, redisPort]) {
    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error('Invalid port configuration');
    }
  }

  const databaseUrl = new URL(
    String(config.DATABASE_URL),
  );

  if (
    !['postgresql:', 'postgres:'].includes(
      databaseUrl.protocol,
    )
  ) {
    throw new Error('Invalid PostgreSQL URL');
  }

  const frontendUrl = new URL(
    String(config.FRONTEND_URL),
  );

  if (
    !['http:', 'https:'].includes(
      frontendUrl.protocol,
    )
  ) {
    throw new Error('Invalid frontend URL');
  }

  return config;
}

interface RuntimeConfig {
  WHISPER_SERVER_HOST: string;
  WHISPER_SERVER_PORT: string;
  getWebSocketUrl: () => string;
}

const getConfigValue = (
  key: keyof Omit<RuntimeConfig, 'getWebSocketUrl'>,
  defaultValue: string,
): string => {
  const envKey = `NEXT_PUBLIC_${key}` as keyof typeof process.env;
  const value = process.env[envKey];
  if (value === undefined || value === null) {
    console.warn(
      `Configuration value for ${envKey} is not set. Using default value.`,
    );
    return defaultValue;
  }
  return String(value);
};

export const config: RuntimeConfig = {
  WHISPER_SERVER_HOST: getConfigValue(
    'WHISPER_SERVER_HOST',
    'welsh.schuettc.dev',
  ),
  WHISPER_SERVER_PORT: getConfigValue('WHISPER_SERVER_PORT', '8765'),
  getWebSocketUrl: () =>
    `wss://${config.WHISPER_SERVER_HOST}:${config.WHISPER_SERVER_PORT}`,
};

console.log('Config values:', {
  WHISPER_SERVER_HOST: config.WHISPER_SERVER_HOST,
  WHISPER_SERVER_PORT: config.WHISPER_SERVER_PORT,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@cloudscape-design/components',
    '@cloudscape-design/component-toolkit',
  ],
  compiler: {
    styledComponents: true,
  },
  i18n: {
    locales: ['en', 'cy'],
    defaultLocale: 'en',
  },
  env: {
    NEXT_PUBLIC_WHISPER_SERVER_HOST:
      process.env.NEXT_PUBLIC_WHISPER_SERVER_HOST,
    NEXT_PUBLIC_WHISPER_SERVER_PORT:
      process.env.NEXT_PUBLIC_WHISPER_SERVER_PORT,
  },
  publicRuntimeConfig: {
    NEXT_PUBLIC_WHISPER_SERVER_HOST:
      process.env.NEXT_PUBLIC_WHISPER_SERVER_HOST,
    NEXT_PUBLIC_WHISPER_SERVER_PORT:
      process.env.NEXT_PUBLIC_WHISPER_SERVER_PORT,
  },
};

module.exports = nextConfig;

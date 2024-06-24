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
};

module.exports = nextConfig;

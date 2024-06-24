import { web } from 'projen';
const project = new web.NextJsTypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'welsh-translator',
  projenrcTs: true,
  tailwind: false,
  deps: [
    '@aws-sdk/client-chime-sdk-meetings',
    '@aws-sdk/client-bedrock-runtime',
    '@cloudscape-design/components',
    '@cloudscape-design/global-styles',
    'amazon-chime-sdk-component-library-react',
    'amazon-chime-sdk-js',
    'styled-components',
    'styled-system',
    '@emotion/is-prop-valid',
  ],
  tsconfig: {
    compilerOptions: {
      rootDir: '.',
    },
    include: [
      'pages/**/*.ts',
      'pages/**/*.tsx',
      'components/**/*.ts',
      'components/**/*.tsx',
      'providers/**/*.ts',
      'providers/**/*.tsx',
      '**/*.ts',
      '**/*.tsx',
      'next-env.d.ts',
      '.next/types/**/*.ts',
    ],
    exclude: ['node_modules'],
  },
});
project.synth();

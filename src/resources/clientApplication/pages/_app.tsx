import { ThemeProvider } from 'styled-components';
import {
  MeetingProvider,
  lightTheme,
  LoggerProvider,
} from 'amazon-chime-sdk-component-library-react';
import { ConsoleLogger, LogLevel } from 'amazon-chime-sdk-js';
import React from 'react';
import {
  ContentLayout,
  Header,
  SpaceBetween,
  AppLayout,
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles';
import MeetingComponent from './index';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import './styles/MeetingComponent.css';
import './styles/TranscriptionContainer.css';
if (typeof window === 'undefined') React.useLayoutEffect = () => {};

if (typeof window === 'undefined') React.useLayoutEffect = () => {};

const consoleLogger = new ConsoleLogger('MeetingLogs', LogLevel.ERROR);

const App: React.FC = () => {
  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <ThemeProvider theme={lightTheme}>
        <LoggerProvider logger={consoleLogger}>
          <MeetingProvider>
            <AppLayout
              content={
                <ContentLayout
                  header={
                    <SpaceBetween size='m'>
                      <Header variant='h1'>Welsh Translator</Header>
                    </SpaceBetween>
                  }
                >
                  <MeetingComponent />
                </ContentLayout>
              }
              navigationHide={true}
              toolsHide={true}
            />
          </MeetingProvider>
        </LoggerProvider>
      </ThemeProvider>
    </StyleSheetManager>
  );
};

export default App;

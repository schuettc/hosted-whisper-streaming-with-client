import React from 'react';
import { useMeeting } from '../providers/MeetingProvider';
import {
  SpaceBetween,
  Box,
  Container,
  Header,
  Button,
} from '@cloudscape-design/components';
import TranscriptionContainer from './TranscriptionContainer';
import AudioDeviceSelector from './AudioDeviceSelector';
import MeetingControls from './MeetingControls';

const MeetingComponent: React.FC = () => {
  const { isInMeeting, requestId, setRequestId, handleJoin, handleClear } =
    useMeeting();

  if (!isInMeeting) {
    return (
      <SpaceBetween direction='vertical' size='m'>
        <input
          type='text'
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          placeholder='Enter meeting ID'
        />
        <AudioDeviceSelector />
        <Button onClick={handleJoin}>Join Meeting</Button>
      </SpaceBetween>
    );
  }
  return (
    <Container
      header={
        <Header actions={<Button onClick={handleClear}>Clear</Button>}></Header>
      }
      className='meeting-container'
    >
      <SpaceBetween direction='vertical' size='l'>
        <TranscriptionContainer />
        <Box>
          <MeetingControls />
          <div className='audio-device-selector'>
            <AudioDeviceSelector />
          </div>
        </Box>
      </SpaceBetween>
    </Container>
  );
};

export default MeetingComponent;

import React from 'react';
import { useMeeting } from '../providers/MeetingProvider';
import { Button, SpaceBetween } from '@cloudscape-design/components';

const MeetingControls: React.FC = () => {
  const {
    isInMeeting,
    requestId,
    setRequestId,
    handleJoin,
    handleLeave,
    handleEnd,
    isMuted,
    toggleMute,
  } = useMeeting();

  if (!isInMeeting) {
    return (
      <SpaceBetween direction='horizontal' size='s'>
        <input
          onChange={(e) => setRequestId(e.target.value)}
          value={requestId}
          placeholder='Request ID'
          type='text'
        />
        <Button onClick={handleJoin}>Join Meeting</Button>
      </SpaceBetween>
    );
  }

  return (
    <SpaceBetween direction='horizontal' size='s'>
      <Button onClick={handleLeave}>Leave</Button>
      <Button onClick={handleEnd}>End</Button>
      <Button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
    </SpaceBetween>
  );
};

export default MeetingControls;

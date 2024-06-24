import React from 'react';
import { MeetingProvider } from '../providers/MeetingProvider';
import MeetingComponent from '../components/MeetingComponent';

const IndexPage: React.FC = () => {
  return (
    <MeetingProvider>
      <MeetingComponent />
    </MeetingProvider>
  );
};

export default IndexPage;

import React, { useRef, useEffect } from 'react';
import { useMeeting } from '../providers/MeetingProvider';
import { Box, SpaceBetween } from '@cloudscape-design/components';

interface TranscriptionItemProps {
  transcription: any;
  isLocal: boolean;
}

const TranscriptionItem: React.FC<TranscriptionItemProps> = ({
  transcription,
  isLocal,
}) => {
  const isWelshOriginal =
    transcription.originalLanguage.toLowerCase() === 'welsh';

  return (
    <div
      className={`transcription-item ${
        isLocal ? 'transcription-item-local' : 'transcription-item-remote'
      }`}
    >
      <div
        className={`transcription-bubble ${
          isLocal ? 'transcription-bubble-local' : 'transcription-bubble-remote'
        }`}
      >
        <div className='transcription-text'>
          {/* <div className='language-label'>{transcription.originalLanguage}</div> */}
          <div className={isWelshOriginal ? 'welsh-text' : 'english-text'}>
            {transcription.originalText}
          </div>
        </div>
        <div className='transcription-text'>
          {/* <div className='language-label'>
            {transcription.translatedLanguage}
          </div> */}
          <div className={isWelshOriginal ? 'english-text' : 'welsh-text'}>
            {transcription.translatedText}
          </div>
        </div>
      </div>
    </div>
  );
};

const TranscriptionContainer: React.FC = () => {
  const { allTranscriptions } = useMeeting();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [allTranscriptions]);

  return (
    <Box padding='s'>
      <div ref={containerRef} className='transcription-container'>
        <SpaceBetween direction='vertical' size='s'>
          {allTranscriptions.map((t, index) => (
            <TranscriptionItem
              key={index}
              transcription={t}
              isLocal={t.isLocal}
            />
          ))}
        </SpaceBetween>
      </div>
    </Box>
  );
};

export default TranscriptionContainer;

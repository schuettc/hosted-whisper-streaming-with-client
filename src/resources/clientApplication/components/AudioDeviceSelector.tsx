import React, { useEffect } from 'react';
import { useMeeting } from '../providers/MeetingProvider';
import { Select } from '@cloudscape-design/components';

const AudioDeviceSelector: React.FC = () => {
  const {
    mediaDevices,
    selectedDeviceId,
    handleDeviceChange,
    listAudioDevices,
  } = useMeeting();

  useEffect(() => {
    listAudioDevices();
  }, [listAudioDevices]);

  useEffect(() => {
    console.log('Media devices in selector:', mediaDevices);
  }, [mediaDevices]);

  return (
    <Select
      selectedOption={{
        value: selectedDeviceId,
        label:
          mediaDevices.find((d) => d.deviceId === selectedDeviceId)?.label ||
          'Select a device',
      }}
      onChange={({ detail }) =>
        handleDeviceChange({
          target: { value: detail.selectedOption.value },
        } as any)
      }
      options={mediaDevices.map((device) => ({
        value: device.deviceId,
        label: device.label || `Microphone ${device.deviceId}`,
      }))}
      placeholder='Select an audio input device'
    />
  );
};

export default AudioDeviceSelector;

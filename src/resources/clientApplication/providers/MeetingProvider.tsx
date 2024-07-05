import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  AudioVideoFacade,
} from 'amazon-chime-sdk-js';
import { config } from '../config';

console.log('config', JSON.stringify(config, null, 2));

interface MeetingResponse {
  data: {
    Meeting: any;
    Attendee: any;
  };
}

interface MeetingContextType {
  meetingId: string | undefined;
  requestId: string;
  isInMeeting: boolean;
  isStreaming: boolean;
  isMuted: boolean;
  allTranscriptions: any[];
  mediaDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  deviceId: string | undefined;
  setRequestId: (id: string) => void;
  handleJoin: () => Promise<void>;
  handleLeave: () => Promise<void>;
  handleEnd: () => Promise<void>;
  handleClear: () => void;
  handleDeviceChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  startAudioStreaming: () => Promise<void>;
  stopAudioStreaming: () => void;
  toggleMute: () => void;
  listAudioDevices: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

interface MeetingProviderProps {
  children: ReactNode;
}

export const MeetingProvider: React.FC<MeetingProviderProps> = ({
  children,
}) => {
  const [meetingId, setMeetingId] = useState<string | undefined>(undefined);
  const [requestId, setRequestId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [allTranscriptions, setAllTranscriptions] = useState<any[]>([]);
  const [mediaDevices, setMediaDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  const isInMeeting = !!meetingId;
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const meetingSessionRef = useRef<DefaultMeetingSession | null>(null);
  const deviceControllerRef = useRef<DefaultDeviceController | null>(null);
  const audioVideoRef = useRef<AudioVideoFacade | null>(null);

  const bufferSize = 4096;
  const sampleRate = 16000;

  function startAudioStreaming() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        console.log('Config before WebSocket initialization:', config);
        const wsUrl = config.getWebSocketUrl();
        console.log('WebSocket URL:', wsUrl);
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
          console.log('Connected to server');
          setIsStreaming(true);
          resolve();
        };

        socketRef.current.onmessage = async (event) => {
          try {
            console.log('Received message:', event.data);
            const transcriptionData = JSON.parse(event.data);
            console.log(
              'Received transcription:',
              transcriptionData.transcription,
            );

            const translatedData = await translateTranscription(
              transcriptionData,
              true,
            );

            setAllTranscriptions((prev) => [...prev, translatedData]);

            if (audioVideoRef.current) {
              console.log('Sending transcription data to other participants');
              const dataToSend = JSON.stringify(translatedData);
              audioVideoRef.current.realtimeSendDataMessage(
                'transcriptEvent',
                dataToSend,
                30000,
              );
            } else {
              console.log('audioVideo is not available');
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        };

        socketRef.current.onclose = () => {
          console.log('Disconnected from server');
          setIsStreaming(false);
          processorRef.current?.disconnect();
        };

        socketRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsStreaming(false);
          processorRef.current?.disconnect();
          reject(error);
        };

        console.log('Selected device:', deviceId);

        const constraints = {
          audio: {
            deviceId: deviceId,
            sampleRate: sampleRate,
          },
        };
        console.log(`Constraints: ${JSON.stringify(constraints, null, 2)}`);
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia(
          constraints,
        );
        const audioContext = new AudioContext({ sampleRate: sampleRate });
        const source = audioContext.createMediaStreamSource(
          mediaStreamRef.current,
        );
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            const audioData = event.inputBuffer.getChannelData(0);
            const pcmData = convertFloatToPCM16(audioData);
            socketRef.current.send(pcmData.buffer);
          }
        };
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setIsStreaming(false);
        reject(error);
      }
    });
  }

  function stopAudioStreaming() {
    socketRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    processorRef.current?.disconnect();
    setIsStreaming(false);
  }

  const translateTranscription = async (
    transcription: any,
    isLocal: boolean,
  ) => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcription.transcription,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = await response.json();
      return {
        originalLanguage: data.originalLanguage,
        originalText: data.originalText,
        translatedLanguage:
          data.originalLanguage === 'en' ? 'Welsh' : 'English',
        translatedText: data.translatedText,
        isLocal,
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        originalLanguage: 'Unknown',
        originalText: transcription.originalText,
        translatedLanguage: 'Unknown',
        translatedText: '',
        isLocal,
      };
    }
  };

  const handleJoin = useCallback(async () => {
    try {
      const endpoint = '/api/join';
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      };
      const response = await fetch(endpoint, options);
      const result: MeetingResponse = await response.json();

      console.log('Join API response:', result);

      if (!result.data || !result.data.Meeting || !result.data.Attendee) {
        throw new Error('Invalid response from join API');
      }

      const logger = new ConsoleLogger('MeetingLogs', LogLevel.INFO);
      const deviceController = new DefaultDeviceController(logger);

      const configuration = new MeetingSessionConfiguration(
        result.data.Meeting,
        result.data.Attendee,
      );

      console.log('MeetingSessionConfiguration:', configuration);

      meetingSessionRef.current = new DefaultMeetingSession(
        configuration,
        logger,
        deviceController,
      );
      deviceControllerRef.current = deviceController;
      audioVideoRef.current = meetingSessionRef.current.audioVideo;

      // Start audio input with the selected device
      if (selectedDeviceId) {
        await audioVideoRef.current.startAudioInput(selectedDeviceId);
      }

      await audioVideoRef.current.start();
      setMeetingId(result.data.Meeting.MeetingId);

      // Start audio streaming after joining the meeting
      await startAudioStreaming();
    } catch (error) {
      console.error('Error joining meeting:', error);
      // Handle the error appropriately, e.g., show an error message to the user
    }
  }, [requestId, selectedDeviceId]);

  const releaseAudioDevice = useCallback(async () => {
    if (audioVideoRef.current) {
      try {
        await audioVideoRef.current.stopAudioInput();
        console.log('Audio input stopped');
      } catch (error) {
        console.error('Error stopping audio input:', error);
      }
    }
  }, []);

  const handleLeave = useCallback(async () => {
    if (audioVideoRef.current) {
      audioVideoRef.current.stop();
    }
    await releaseAudioDevice();
    stopAudioStreaming();
    setMeetingId(undefined);
  }, [releaseAudioDevice, stopAudioStreaming]);

  const handleEnd = useCallback(async () => {
    if (meetingId) {
      const endpoint = '/api/end';
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId }),
      };
      await fetch(endpoint, options);
      await releaseAudioDevice();
      stopAudioStreaming();
      setMeetingId(undefined);
    }
  }, [meetingId, releaseAudioDevice, stopAudioStreaming]);

  const handleClear = useCallback(() => {
    setAllTranscriptions([]);
  }, []);

  const toggleMute = useCallback(() => {
    if (audioVideoRef.current) {
      if (isMuted) {
        audioVideoRef.current.realtimeUnmuteLocalAudio();
        startAudioStreaming();
      } else {
        audioVideoRef.current.realtimeMuteLocalAudio();
        stopAudioStreaming();
      }
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const listAudioDevices = useCallback(async () => {
    console.log('Attempting to list audio devices...');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(
        (device) => device.kind === 'audioinput',
      );
      console.log('Audio input devices:', audioInputDevices);
      setMediaDevices(audioInputDevices);
      if (audioInputDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputDevices[0].deviceId);
        setDeviceId(audioInputDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error listing audio devices:', error);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    listAudioDevices();
  }, [listAudioDevices]);

  const handleDeviceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newDeviceId = event.target.value;
      setSelectedDeviceId(newDeviceId);
      setDeviceId(newDeviceId);
    },
    [],
  );

  const convertFloatToPCM16 = (floatData: Float32Array): Int16Array => {
    const pcmData = new Int16Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
      const sample = Math.max(-1, Math.min(1, floatData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return pcmData;
  };

  useEffect(() => {
    if (!audioVideoRef.current) {
      return;
    }

    const handleTranscriptEvent = async (dataMessage: any) => {
      console.log('Received data message:', dataMessage);
      try {
        const textDecoder = new TextDecoder('utf-8');
        const jsonString = textDecoder.decode(dataMessage.data);
        console.log('Decoded message:', jsonString);

        const receivedData = JSON.parse(jsonString);
        console.log('Parsed received transcript:', receivedData);

        if (receivedData && receivedData.originalText) {
          setAllTranscriptions((prev) => [
            ...prev,
            { ...receivedData, isLocal: false },
          ]);
        } else {
          console.warn(
            'Received data does not contain a transcription:',
            receivedData,
          );
        }
      } catch (error) {
        console.error('Error processing received data:', error);
        console.error('Raw data:', dataMessage.data);
      }
    };

    audioVideoRef.current.realtimeSubscribeToReceiveDataMessage(
      'transcriptEvent',
      handleTranscriptEvent,
    );

    return () => {
      console.log('Unsubscribing from data messages');
      audioVideoRef.current?.realtimeUnsubscribeFromReceiveDataMessage(
        'transcriptEvent',
      );
    };
  }, []);

  useEffect(() => {
    const handleAudioInputChange = async () => {
      if (isStreaming) {
        stopAudioStreaming();
        await startAudioStreaming();
      }
    };

    audioVideoRef.current?.addDeviceChangeObserver({
      audioInputsChanged: handleAudioInputChange,
    });

    return () => {
      audioVideoRef.current?.removeDeviceChangeObserver({
        audioInputsChanged: handleAudioInputChange,
      });
    };
  }, [isStreaming]);

  const value = {
    meetingId,
    requestId,
    isInMeeting,
    isStreaming,
    isMuted,
    allTranscriptions,
    mediaDevices,
    selectedDeviceId,
    deviceId,
    setRequestId,
    handleJoin,
    handleLeave,
    handleEnd,
    handleClear,
    handleDeviceChange,
    startAudioStreaming,
    stopAudioStreaming,
    toggleMute,
    listAudioDevices,
    releaseAudioDevice,
  };

  return (
    <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>
  );
};

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
};

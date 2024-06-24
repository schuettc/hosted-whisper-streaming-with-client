import { randomUUID } from 'crypto';
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  CreateMeetingCommandOutput,
  CreateAttendeeCommandOutput,
} from '@aws-sdk/client-chime-sdk-meetings';
import { NextApiRequest, NextApiResponse } from 'next';

const config = {
  region: 'us-east-1',
};

const chimeSdkMeetingsClient = new ChimeSDKMeetingsClient(config);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const requestId = req.body.requestId;
  console.info(`RequestID: ${requestId}`);

  const meetingInfo = await createMeeting(requestId || randomUUID());
  // console.info(`MeetingInfo: ${JSON.stringify(meetingInfo)}`);

  if (meetingInfo && meetingInfo.Meeting && meetingInfo.Meeting.MeetingId) {
    const attendeeInfo = await createAttendee(meetingInfo.Meeting.MeetingId);
    if (attendeeInfo) {
      // console.info(`AttendeeInfo: ${JSON.stringify(attendeeInfo)}`);
      const responseInfo = {
        Meeting: meetingInfo.Meeting,
        Attendee: attendeeInfo.Attendee,
      };
      // console.info('joinInfo: ' + JSON.stringify(responseInfo));
      res.status(200).json({ data: responseInfo });
    } else {
      res.status(503).json({ data: 'Error creating attendee' });
    }
  } else {
    res.status(503).json({ data: 'Error creating meeting' });
  }
}

async function createMeeting(
  requestId: string,
): Promise<CreateMeetingCommandOutput | false> {
  console.log(`Creating Meeting for Request ID: ${requestId}`);
  try {
    const meetingInfo = await chimeSdkMeetingsClient.send(
      new CreateMeetingCommand({
        ClientRequestToken: requestId,
        MediaRegion: 'us-east-1',
        ExternalMeetingId: randomUUID(),
      }),
    );
    return meetingInfo;
  } catch (err) {
    console.error(`Error creating meeting: ${err}`);
    return false;
  }
}

async function createAttendee(
  meetingId: string,
): Promise<CreateAttendeeCommandOutput | false> {
  console.log(`Creating Attendee for Meeting: ${meetingId}`);
  try {
    const attendeeInfo = await chimeSdkMeetingsClient.send(
      new CreateAttendeeCommand({
        MeetingId: meetingId,
        ExternalUserId: randomUUID(),
      }),
    );
    return attendeeInfo;
  } catch (err) {
    console.error(`Error creating attendee: ${err}`);
    return false;
  }
}

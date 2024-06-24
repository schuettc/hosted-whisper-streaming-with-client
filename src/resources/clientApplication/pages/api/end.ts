import {
  ChimeSDKMeetingsClient,
  DeleteMeetingCommand,
  DeleteMeetingCommandInput,
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
  const meetingId = req.body.meetingId;

  if (meetingId) {
    console.log(`Ending Meeting: ${meetingId}`);

    if (await deleteMeeting(meetingId)) {
      console.info('Meeting Deleted');
      res.status(200).json({ data: 'Meeting Deleted' });
    } else {
      res.status(503).json({ data: 'Error deleting meeting' });
    }
  } else {
    console.info('No meeting to delete');
    res.status(404).json({ data: 'No meeting to delete' });
  }
}

async function deleteMeeting(meetingId: string): Promise<boolean> {
  try {
    const params: DeleteMeetingCommandInput = {
      MeetingId: meetingId,
    };

    await chimeSdkMeetingsClient.send(new DeleteMeetingCommand(params));
    return true;
  } catch (err) {
    console.error(`Error deleting meeting: ${err}`);
    return false;
  }
}

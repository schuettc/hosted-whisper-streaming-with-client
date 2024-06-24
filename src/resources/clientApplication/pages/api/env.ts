import { NextApiRequest, NextApiResponse } from 'next';
import { config } from '../../config';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    WHISPER_SERVER_HOST: config.WHISPER_SERVER_HOST,
    WHISPER_SERVER_PORT: config.WHISPER_SERVER_PORT,
  });
}

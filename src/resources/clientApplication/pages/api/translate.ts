import { NextApiRequest, NextApiResponse } from 'next';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseRequest,
  ConverseResponse,
  Message,
} from '@aws-sdk/client-bedrock-runtime';

const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
const REGION = 'us-east-1';
const TEMPERATURE = 0.0;
const MAX_TOKENS = 1000;

const client = new BedrockRuntimeClient({ region: REGION });

const toolConfig = {
  toolChoice: { tool: { name: 'translate_transcription' } },
  tools: [
    {
      toolSpec: {
        name: 'translate_transcription',
        description: 'Use this tool to display transcription results ',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              originalLanguage: {
                type: 'string',
                description:
                  'The original language that was translated from.  en for English and cy for Welsh',
                enum: ['en', 'cy'],
              },
              originalText: {
                type: 'string',
                description: 'The text to be translated',
              },
              translatedLanguage: {
                type: 'string',
                description:
                  'The original language that was translated from.  en for English and cy for Welsh',
                enum: ['en', 'cy'],
              },
              translatedText: {
                type: 'string',
                description: 'The text that was translated',
              },
            },
            required: [
              'originalLanguage',
              'originalText',
              'translatedLanguage',
              'translatedText',
            ],
          },
        },
      },
    },
  ],
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === 'POST') {
    const { text } = req.body;

    const systemPrompt = `
      You are a Welsh-English translator. Determine if the input is Welsh or English, then translate it to the other language.
    `;

    const userPrompt = `You have access to tools that you can use to process the output of the translation.  Translate the following text: ${text}`;

    const input: ConverseRequest = {
      modelId: MODEL_ID,
      messages: [{ role: 'user', content: [{ text: userPrompt }] }],
      system: [{ text: systemPrompt }],
      toolConfig: toolConfig,
      inferenceConfig: {
        maxTokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      },
    };

    try {
      const response: ConverseResponse = await client.send(
        new ConverseCommand(input),
      );

      const assistantMessage: Message | undefined = response.output!.message;
      console.log(JSON.stringify(assistantMessage, null, 2));
      if (
        assistantMessage &&
        assistantMessage.content &&
        assistantMessage.content[0].toolUse
      ) {
        const translationResult = assistantMessage.content[0].toolUse.input;
        res.status(200).json(translationResult);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'An error occurred during translation' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

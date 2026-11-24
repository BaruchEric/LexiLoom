import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Shared server-side Gemini client utility with required AI Studio telemetry header
function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface WordInsightPayload {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  etymology: string;
  originLanguage: string;
  era: string;
  exampleSentence: string;
  relatedRoots: string[];
}

const wordInsightCache = new Map<string, WordInsightPayload>();

async function generateWordInsightWithRetry(
  ai: GoogleGenAI,
  word: string,
  context?: string
): Promise<WordInsightPayload> {
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const contextLine = context
        ? `Puzzle clue context: "${context.slice(0, 140)}".`
        : '';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Provide a crisp dictionary definition and rich etymology for the English solution word "${word}". ${contextLine}`,
        config: {
          systemInstruction:
            'You are an expert lexicographer and etymologist for an editorial daily word puzzle game. Return concise, accurate, engaging JSON strictly matching the schema. Keep the definition to 1-2 clear sentences and the etymology to 2-3 vivid sentences tracing linguistic roots and historical development.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: {
                type: Type.STRING,
                description: 'The uppercase target word.',
              },
              phonetic: {
                type: Type.STRING,
                description:
                  'Simple phonetic pronunciation guide, e.g. OR-kid or PRIZ-uhm.',
              },
              partOfSpeech: {
                type: Type.STRING,
                description: 'Primary part of speech (e.g. noun, verb, adjective).',
              },
              definition: {
                type: Type.STRING,
                description: 'Clear 1-2 sentence definition of the word.',
              },
              etymology: {
                type: Type.STRING,
                description:
                  'Concise 2-3 sentence etymological history tracing root words and meaning shifts.',
              },
              originLanguage: {
                type: Type.STRING,
                description:
                  'Primary root language family (e.g. Ancient Greek, Old French, Latin, Old English).',
              },
              era: {
                type: Type.STRING,
                description:
                  'Approximate era the word entered English (e.g. 16th century, Old English, Mid-19th century).',
              },
              exampleSentence: {
                type: Type.STRING,
                description: 'One natural, editorial example sentence using the word.',
              },
              relatedRoots: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Up to 3 related English words or root terms sharing the same etymological lineage.',
              },
            },
            required: [
              'word',
              'phonetic',
              'partOfSpeech',
              'definition',
              'etymology',
              'originLanguage',
              'era',
              'exampleSentence',
              'relatedRoots',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsed = JSON.parse(rawText) as Partial<WordInsightPayload>;
      return {
        word: (parsed.word || word).toUpperCase(),
        phonetic: parsed.phonetic || '',
        partOfSpeech: parsed.partOfSpeech || 'word',
        definition:
          parsed.definition || 'Definition unavailable for this word.',
        etymology:
          parsed.etymology || 'Etymological details unavailable for this word.',
        originLanguage: parsed.originLanguage || 'Unknown origin',
        era: parsed.era || 'Historical English',
        exampleSentence: parsed.exampleSentence || '',
        relatedRoots: Array.isArray(parsed.relatedRoots)
          ? parsed.relatedRoots
              .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
              .slice(0, 4)
          : [],
      };
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        attempt < maxAttempts &&
        !/API_KEY_INVALID|PERMISSION_DENIED|403|400|404/i.test(errMsg);
      if (!isRetryable) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.post('/api/word-insights', async (req: Request, res: Response) => {
    const rawWord = typeof req.body?.word === 'string' ? req.body.word : '';
    const context =
      typeof req.body?.context === 'string' ? req.body.context : undefined;
    const cleanWord = rawWord.trim().toUpperCase();

    if (!/^[A-Z-]{2,32}$/.test(cleanWord)) {
      res.status(400).json({
        error: 'Please provide a valid puzzle solution word (2–32 letters).',
      });
      return;
    }

    const cached = wordInsightCache.get(cleanWord);
    if (cached) {
      res.json(cached);
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(500).json({
        error:
          'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    try {
      const insight = await generateWordInsightWithRetry(ai, cleanWord, context);
      if (wordInsightCache.size > 250) {
        const firstKey = wordInsightCache.keys().next().value;
        if (firstKey) wordInsightCache.delete(firstKey);
      }
      wordInsightCache.set(cleanWord, insight);
      res.json(insight);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach Gemini API.';
      console.error('[/api/word-insights] Gemini error:', message);

      if (/PERMISSION_DENIED|API_KEY_INVALID|403|400/i.test(message)) {
        res.status(502).json({
          error:
            'Unable to authenticate with Gemini API. Please verify your API key in Settings > Secrets.',
        });
        return;
      }
      if (/RESOURCE_EXHAUSTED|429/i.test(message)) {
        res.status(429).json({
          error:
            'Gemini API rate limit reached. Please wait a moment and try again.',
        });
        return;
      }
      res.status(502).json({
        error:
          'Could not load the definition and etymology right now. Please try again.',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const distIndex = path.join(distDir, 'index.html');
    app.use(express.static(distDir));
    app.get('/{*splat}', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      if (fs.existsSync(distIndex)) {
        res.sendFile(distIndex);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LexiLoom server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();

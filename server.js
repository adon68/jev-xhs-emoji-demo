import express from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err?.message || err);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 8787;
const KEY_DIR = path.join(os.homedir(), '.config', 'jev-emoji-demo');
const KEY_FILE = path.join(KEY_DIR, 'api-key.txt');

const CONFIDENCE_THRESHOLD = 0.28;
const SHOULD_INSERT_THRESHOLD = 0.25;

let memoryKey = null;

const EMOJI_CRITERIA = {
  none: 'The sentence has no clear meaning/mood/topic for a Xiaohongshu sticker',
  'doge': 'Doge meme deadpan ironic vibe',
  '买爆': 'Shopping spree urge, want to buy everything',
  '亲一个': 'Want a kiss affectionate peck',
  '偷笑': 'Secret chuckle, sly quiet laugh',
  '再见': 'Saying goodbye see you',
  '冰淇淋': 'Ice cream treat summer dessert',
  '变猪猪': 'Feeling like a pig after overeating',
  '可怜': 'Pitiful begging for sympathy',
  '叹气': 'Sighing weary resignation',
  '吃瓜': 'Watching drama as bystander gossip spectator',
  '吃粽子': 'Eating zongzi festival food',
  '吐舌头': 'Tongue out playful tease',
  '吧唧': 'Munching eating with relish cute',
  '呃': 'Awkward uh speechless pause',
  '哇': 'Amazed wow, impressed surprise',
  '哭惹': 'Cute crying, soft tearful sadness',
  '喝奶茶': 'Drinking milk tea, cafe treat vibe',
  '嘻嘻': 'Hehe giggle playful laugh',
  '坏笑': 'Mischievous grin scheming smile',
  '大笑': 'Big loud laugh, high amusement',
  '失望': 'Disappointed, let down, mild sadness',
  '完啦': 'Oh no we are done for doomed playfully',
  '害羞': 'Shy, bashful, blushing cute embarrassment',
  '尬住': 'Frozen awkward socially stuck',
  '得意': 'Smug proud pleased with oneself',
  '微笑': 'Polite mild smile, everyday friendly warmth',
  '心心眼': 'Heart eyes loving something a lot',
  '惊恐': 'Scared startled fear',
  '扯脸': 'Pulling face awkward stretch',
  '扶墙': 'Need to lean on wall overwhelmed dizzy',
  '扶额': 'Hand on forehead frustrated sigh',
  '抓狂': 'Freaking out overwhelmed panic',
  '抠鼻': 'Picking nose idle awkward carelessness',
  '抽泣': 'Light sobbing sniffle cry',
  '拔草': 'Giving up wanting a product un-wishlist',
  '捂嘴笑': 'Laughing while covering mouth',
  '捂脸': 'Facepalm cover face embarrassment',
  '斜眼': 'Side-eye skeptical glance',
  '暗中观察': 'Quietly watching, lurking, observing',
  '棒': 'Great job awesome solid',
  '棒棒糖': 'Lollipop cute sweet vibe',
  '汗颜': 'Awkward sweat drop, embarrassed speechless',
  '泪崩': 'Burst into tears emotional collapse',
  '派对': 'Party celebration festive mood',
  '火': 'Fire, hot, trending, hype energy',
  '火箭': 'Rocket launch, takeoff energy, rapid growth',
  '生气': 'Angry, annoyed, mad',
  '皱眉': 'Frowning confused concern',
  '睡觉': 'Sleepy going to bed exhausted',
  '石化': 'Frozen in shock, stunned speechless',
  '种草': 'Getting product interest wishlist urge',
  '笑哭': 'Laugh-cry, funny but painful wry amusement',
  '笑哭了': 'Laugh until cry hilarious',
  '自拍': 'Taking a selfie, posing for camera',
  '色色': 'Flirty thirsty admiring beauty playfully',
  '萌萌哒': 'Extra cute adorable soft kawaii',
  '赞': 'Thumbs-up approve, praise, support',
  '超喜欢': 'Really really like love this',
  '蹲后续': 'Waiting for the sequel / next update',
  '鄙视': 'Disdain looking down on',
  '飞吻': 'Blowing a kiss, flirty goodbye',
  '飞机': 'Airplane travel, flying, boarding a flight, airport trip',
  '黄金薯': 'Golden potato pride show-off cute',
  '黑薯问号': 'Confused question marks huh',
};

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function getApiKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  if (process.env.JEV_API_KEY) return process.env.JEV_API_KEY;
  if (memoryKey) return memoryKey;
  if (!existsSync(KEY_FILE)) return null;
  try {
    const v = (await readFile(KEY_FILE, 'utf8')).trim();
    if (v) memoryKey = v;
    return v || null;
  } catch (err) {
    console.error('read key failed', err.message);
    return null;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/key-status', async (_req, res) => {
  try {
    res.json({ configured: !!(await getApiKey()) });
  } catch (err) {
    res.status(500).json({ error: 'status failed' });
  }
});

app.post('/api/save-key', async (req, res) => {
  try {
    const apiKey = req.body?.apiKey;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
      return res.status(400).json({ error: 'Invalid API key' });
    }
    memoryKey = apiKey.trim();
    try {
      await mkdir(KEY_DIR, { recursive: true });
      await writeFile(KEY_FILE, memoryKey, { encoding: 'utf8', mode: 0o600 });
    } catch (err) {
      console.error('persist key failed (kept in memory)', err.message);
    }
    res.json({ success: true, persisted: existsSync(KEY_FILE) });
  } catch (err) {
    console.error('save-key', err.message);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

app.post('/api/suggest-emoji', async (req, res) => {
  const text = req.body?.text;
  const requestId = req.body?.requestId;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return res.status(401).json({ error: 'API key not configured' });
  }

  const payload = {
    model: 'jev-latest',
    state: { text: text.slice(-200) },
    questions: {
      emoji: {
        type: 'choice',
        instructions: {
          goal: 'Judge the MEANING of the whole phrase in `text`, not whether a keyword appears.',
          question: 'Which Xiaohongshu sticker best fits what this sentence is about or how it feels? Pick the sticker whose meaning matches the whole phrase (mood, weather, food, shopping, etc.). Do not require the emoji name or a specific word to be present.',
          avoid: 'Do not pick based on a single word if the overall meaning points elsewhere. Pick none only when the meaning is unclear or no emoji would feel natural.',
        },
        criteria: EMOJI_CRITERIA,
      },
      should_insert: {
        type: 'noul',
        instructions: {
          question: 'Does `text` express a clear finished meaning that a person would naturally end with an emoji in casual chat?',
          prefer_yes: 'Clear topic or feeling even without emoji keywords (e.g. cloudy weather, tasty coffee, tired after work).',
          prefer_no: 'Incomplete typing, mid-pinyin, or meaning too vague for an emoji.',
        },
        criteria: {
          true: 'Clear meaningful utterance worth trailing with an emoji',
          false: 'Incomplete, fragmented, or no natural emoji fit',
        },
      },
    },
  };

  const started = Date.now();
  try {
    const response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseTime = Date.now() - started;
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: response.status === 401 ? 'Invalid API key' : 'API request failed',
        details: typeof data === 'object' ? data : raw,
        requestId,
        responseTime,
      });
    }

    const emojiAnswer = data.answers?.emoji;
    const emojiChoice = emojiAnswer?.choice;
    const confidence = emojiAnswer?.confidence ?? 0;
    const probabilities = emojiAnswer?.probabilities ?? {};
    const shouldInsert = data.answers?.should_insert?.noul ?? 0;

    // Meaning-first: trust Choice. Only gently recover if none won but
    // a concrete emoji still carries solid probability AND the utterance feels complete.
    let finalChoice = emojiChoice;
    let finalConfidence = confidence;
    if ((!finalChoice || finalChoice === 'none') && shouldInsert >= SHOULD_INSERT_THRESHOLD) {
      const ranked = Object.entries(probabilities)
        .filter(([k]) => k !== 'none')
        .sort((a, b) => b[1] - a[1]);
      if (ranked.length && ranked[0][1] >= 0.20) {
        finalChoice = ranked[0][0];
        finalConfidence = Math.max(ranked[0][1], confidence);
      }
    }

    const accepted =
      !!finalChoice &&
      finalChoice !== 'none' &&
      finalConfidence >= CONFIDENCE_THRESHOLD &&
      (shouldInsert >= SHOULD_INSERT_THRESHOLD || finalConfidence >= 0.42);

    const top3 = Object.entries(probabilities)
      .filter(([k]) => k !== 'none')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emoji, p]) => ({ emoji, p }));

    res.json({
      requestId,
      emoji: accepted ? finalChoice : null,
      choice: finalChoice,
      confidence: finalConfidence,
      shouldInsert,
      probabilities,
      top3,
      responseTime,
      accepted,
      reason: accepted
        ? null
        : (!finalChoice || finalChoice === 'none')
          ? 'No matching emoji'
          : finalConfidence < CONFIDENCE_THRESHOLD
            ? 'Low confidence'
            : 'Low should_insert score',
    });
  } catch (err) {
    console.error('suggest-emoji', err.message);
    res.status(500).json({
      error: 'Request failed',
      details: err.message,
      requestId,
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error('express', err.message);
  res.status(500).json({ error: 'Server error' });
});

export default app;
if (!process.env.VERCEL) {
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Jev emoji demo http://127.0.0.1:${PORT}`);
});
server.on('error', (err) => {
  console.error('listen error', err.message);
  process.exit(1);
});
}

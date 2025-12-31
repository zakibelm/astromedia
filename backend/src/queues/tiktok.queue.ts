// =====================================
// TIKTOK AUTO-REPLY QUEUE
// =====================================
// Handles TikTok comments and DMs

import { Queue, Worker, Job } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from './config';
import { PrismaClient } from '@prisma/client';
import { runLLM } from '../../../services/llmRouter';

const prisma = new PrismaClient();

// =====================================
// TYPES
// =====================================

interface TikTokMessageData {
  messageId: string;
  senderId: string;
  messageText: string;
  timestamp: string;
  platform: 'tiktok';
  type: 'comment' | 'dm'; // TikTok supports both comments and DMs
}

interface TikTokJobResult {
  success: boolean;
  reply?: string;
  sentiment?: string;
  error?: string;
}

// =====================================
// QUEUE DEFINITION
// =====================================

export const tiktokQueue = new Queue<TikTokMessageData>('tiktok', defaultQueueOptions);

// =====================================
// JOB PROCESSOR
// =====================================

async function processTikTokMessage(job: Job<TikTokMessageData>): Promise<TikTokJobResult> {
  const { messageId, senderId, messageText, timestamp, type } = job.data;
  const startTime = Date.now();

  try {
    await job.updateProgress(10);

    // Step 1: Analyze sentiment
    console.log(`[TikTok Queue] Analyzing sentiment for ${type} ${messageId}`);

    const sentimentResult = await runLLM({
      agent: 'sentiment-analyzer',
      input: `Analyze the sentiment of this message: "${messageText}"`,
      systemInstruction: 'You are a sentiment analyzer. Respond with only one word: positive, neutral, or negative.',
      criteria: 'cost',
    });

    const sentiment = sentimentResult.response?.choices?.[0]?.message?.content?.toLowerCase().trim() || 'neutral';
    await job.updateProgress(40);

    // Step 2: Generate reply (casual, trendy tone for TikTok)
    console.log(`[TikTok Queue] Generating reply for ${type} ${messageId} (sentiment: ${sentiment})`);

    const replyResult = await runLLM({
      agent: 'tiktok-responder',
      input: messageText,
      systemInstruction: `Tu es un assistant marketing pour un restaurant québécois sur TikTok.
Réponds aux ${type === 'comment' ? 'commentaires' : 'messages'} de façon fun, décontractée et en français.
Ton jeune et énergique, avec des émojis si approprié.
Garde les réponses très courtes (max 80 mots - TikTok est rapide!).

Le sentiment du message est: ${sentiment}

${sentiment === 'negative' ? 'Reste positif et transforme ça en expérience fun.' : ''}
${sentiment === 'positive' ? 'Célèbre avec le client! Sois enthousiaste.' : ''}
`,
      criteria: 'balanced',
    });

    const reply = replyResult.response?.choices?.[0]?.message?.content || 'Merci! 🎉';
    const aiCost = (sentimentResult.cost || 0) + (replyResult.cost || 0);

    await job.updateProgress(70);

    // Step 3: Save to database
    console.log(`[TikTok Queue] Saving interaction to database`);

    await prisma.socialInteraction.create({
      data: {
        platform: 'tiktok',
        messageId,
        senderId,
        messageText,
        replyText: reply,
        sentiment,
        aiCost,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date(timestamp),
        metadata: { type }, // Store whether it's a comment or DM
      },
    });

    await job.updateProgress(90);

    // Step 4: Send reply via TikTok API
    console.log(`[TikTok Queue] Sending reply via TikTok API`);
    await sendTikTokReply(messageId, reply, type);

    await job.updateProgress(95);

    // Step 5: Update lead score
    console.log(`[TikTok Queue] Updating lead score`);
    await updateLeadScore(senderId, 'tiktok');

    await job.updateProgress(100);

    console.log(`[TikTok Queue] ✓ Completed ${type} ${messageId} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      reply,
      sentiment,
    };

  } catch (error: any) {
    console.error(`[TikTok Queue] ✗ Error processing ${job.data.type} ${messageId}:`, error);

    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

async function sendTikTokReply(messageId: string, reply: string, type: 'comment' | 'dm'): Promise<void> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('[TikTok Queue] No TikTok access token configured, skipping actual send');
    return;
  }

  try {
    const endpoint = type === 'comment'
      ? `https://open.tiktokapis.com/v2/comment/reply/`
      : `https://open.tiktokapis.com/v2/message/send/`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        [type === 'comment' ? 'comment_id' : 'message_id']: messageId,
        text: reply,
      }),
    });

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.status} ${response.statusText}`);
    }

    console.log(`[TikTok Queue] ✓ Reply sent successfully`);
  } catch (error: any) {
    console.error(`[TikTok Queue] Failed to send TikTok reply:`, error);
    throw error;
  }
}

async function updateLeadScore(senderId: string, platform: string): Promise<void> {
  try {
    await prisma.leadProfile.upsert({
      where: {
        platformUserId: `${platform}:${senderId}`,
      },
      update: {
        totalInteractions: {
          increment: 1,
        },
        engagementScore: {
          increment: 7, // TikTok engagement is valuable (young audience)
        },
        lastInteraction: new Date(),
      },
      create: {
        platformUserId: `${platform}:${senderId}`,
        platform,
        totalInteractions: 1,
        engagementScore: 7,
        leadStatus: 'new',
        lastInteraction: new Date(),
      },
    });

    console.log(`[TikTok Queue] ✓ Lead score updated for ${senderId}`);
  } catch (error: any) {
    console.error(`[TikTok Queue] Failed to update lead score:`, error);
  }
}

// =====================================
// WORKER
// =====================================

export const tiktokWorker = new Worker<TikTokMessageData, TikTokJobResult>(
  'tiktok',
  processTikTokMessage,
  {
    ...defaultWorkerOptions,
    concurrency: 5, // TikTok moves fast, higher concurrency
  }
);

// Event listeners
tiktokWorker.on('completed', (job) => {
  console.log(`[TikTok Worker] Job ${job.id} completed`);
});

tiktokWorker.on('failed', (job, err) => {
  console.error(`[TikTok Worker] Job ${job?.id} failed:`, err);
});

tiktokWorker.on('error', (err) => {
  console.error('[TikTok Worker] Worker error:', err);
});

// =====================================
// HELPER: Add job to queue
// =====================================

export async function queueTikTokMessage(data: TikTokMessageData) {
  const job = await tiktokQueue.add('tiktok-reply', data, {
    jobId: `tiktok-${data.messageId}`,
  });

  console.log(`[TikTok Queue] Job ${job.id} queued for ${data.type} ${data.messageId}`);

  return job;
}

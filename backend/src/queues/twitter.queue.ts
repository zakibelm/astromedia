// =====================================
// X (TWITTER) AUTO-REPLY QUEUE
// =====================================
// Handles X/Twitter mentions, DMs, and replies

import { Queue, Worker, Job } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from './config';
import { PrismaClient } from '@prisma/client';
import { runLLM } from '../services/llm/llmRouter';

const prisma = new PrismaClient();

// =====================================
// TYPES
// =====================================

interface TwitterMessageData {
  messageId: string;
  senderId: string;
  messageText: string;
  timestamp: string;
  platform: 'twitter';
  type: 'mention' | 'dm' | 'reply'; // X supports multiple interaction types
}

interface TwitterJobResult {
  success: boolean;
  reply?: string;
  sentiment?: string;
  error?: string;
}

// =====================================
// QUEUE DEFINITION
// =====================================

export const twitterQueue = new Queue<TwitterMessageData>('twitter', defaultQueueOptions);

// =====================================
// JOB PROCESSOR
// =====================================

async function processTwitterMessage(job: Job<TwitterMessageData>): Promise<TwitterJobResult> {
  const { messageId, senderId, messageText, timestamp, type } = job.data;
  const startTime = Date.now();

  try {
    await job.updateProgress(10);

    // Step 1: Analyze sentiment
    console.log(`[Twitter Queue] Analyzing sentiment for ${type} ${messageId}`);

    const sentimentResult = await runLLM({
      agent: 'sentiment-analyzer',
      input: `Analyze the sentiment of this message: "${messageText}"`,
      systemInstruction: 'You are a sentiment analyzer. Respond with only one word: positive, neutral, or negative.',
      criteria: 'cost',
    });

    const sentiment = sentimentResult.response?.choices?.[0]?.message?.content?.toLowerCase().trim() || 'neutral';
    await job.updateProgress(40);

    // Step 2: Generate reply (concise, witty tone for X/Twitter)
    console.log(`[Twitter Queue] Generating reply for ${type} ${messageId} (sentiment: ${sentiment})`);

    const replyResult = await runLLM({
      agent: 'twitter-responder',
      input: messageText,
      systemInstruction: `Tu es un assistant marketing pour un restaurant québécois sur X (Twitter).
Réponds aux ${type === 'mention' ? 'mentions' : type === 'dm' ? 'messages privés' : 'réponses'} de façon concise et en français.
Ton direct et engageant. Sois créatif mais professionnel.
TRÈS IMPORTANT: Garde les réponses ULTRA courtes (max 280 caractères - limite de X!).

Le sentiment du message est: ${sentiment}

${sentiment === 'negative' ? 'Gère avec tact et rapidité. Propose une solution.' : ''}
${sentiment === 'positive' ? 'Remercie brièvement et amplifie la positivité.' : ''}
`,
      criteria: 'balanced',
    });

    let reply = replyResult.response?.choices?.[0]?.message?.content || 'Merci!';

    // Enforce X's 280 character limit
    if (reply.length > 280) {
      reply = reply.substring(0, 277) + '...';
    }

    const aiCost = (sentimentResult.cost || 0) + (replyResult.cost || 0);

    await job.updateProgress(70);

    // Step 3: Save to database
    console.log(`[Twitter Queue] Saving interaction to database`);

    await prisma.socialInteraction.create({
      data: {
        platform: 'twitter',
        messageId,
        senderId,
        messageText,
        replyText: reply,
        sentiment,
        aiCost,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date(timestamp),
        metadata: { type },
      },
    });

    await job.updateProgress(90);

    // Step 4: Send reply via X API
    console.log(`[Twitter Queue] Sending reply via X API`);
    await sendTwitterReply(messageId, reply, type);

    await job.updateProgress(95);

    // Step 5: Update lead score
    console.log(`[Twitter Queue] Updating lead score`);
    await updateLeadScore(senderId, 'twitter');

    await job.updateProgress(100);

    console.log(`[Twitter Queue] ✓ Completed ${type} ${messageId} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      reply,
      sentiment,
    };

  } catch (error: any) {
    console.error(`[Twitter Queue] ✗ Error processing ${job.data.type} ${messageId}:`, error);

    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

async function sendTwitterReply(messageId: string, reply: string, type: 'mention' | 'dm' | 'reply'): Promise<void> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.warn('[Twitter Queue] Twitter API credentials not configured, skipping actual send');
    return;
  }

  try {
    let endpoint: string;
    let body: any;

    if (type === 'dm') {
      // DM endpoint
      endpoint = 'https://api.twitter.com/2/dm_conversations/with/:participant_id/messages';
      body = { text: reply };
    } else {
      // Tweet reply endpoint
      endpoint = 'https://api.twitter.com/2/tweets';
      body = {
        text: reply,
        reply: {
          in_reply_to_tweet_id: messageId,
        },
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    }

    console.log(`[Twitter Queue] ✓ Reply sent successfully`);
  } catch (error: any) {
    console.error(`[Twitter Queue] Failed to send Twitter reply:`, error);
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
          increment: 6, // Twitter engagement is valuable (broad reach)
        },
        lastInteraction: new Date(),
      },
      create: {
        platformUserId: `${platform}:${senderId}`,
        platform,
        totalInteractions: 1,
        engagementScore: 6,
        leadStatus: 'NEW',
        lastInteraction: new Date(),
      },
    });

    console.log(`[Twitter Queue] ✓ Lead score updated for ${senderId}`);
  } catch (error: any) {
    console.error(`[Twitter Queue] Failed to update lead score:`, error);
  }
}

// =====================================
// WORKER
// =====================================

export const twitterWorker = new Worker<TwitterMessageData, TwitterJobResult>(
  'twitter',
  processTwitterMessage,
  {
    ...defaultWorkerOptions,
    concurrency: 4, // Twitter moves fast
  }
);

// Event listeners
twitterWorker.on('completed', (job) => {
  console.log(`[Twitter Worker] Job ${job.id} completed`);
});

twitterWorker.on('failed', (job, err) => {
  console.error(`[Twitter Worker] Job ${job?.id} failed:`, err);
});

twitterWorker.on('error', (err) => {
  console.error('[Twitter Worker] Worker error:', err);
});

// =====================================
// HELPER: Add job to queue
// =====================================

export async function queueTwitterMessage(data: TwitterMessageData) {
  const job = await twitterQueue.add('twitter-reply', data, {
    jobId: `twitter-${data.messageId}`,
  });

  console.log(`[Twitter Queue] Job ${job.id} queued for ${data.type} ${data.messageId}`);

  return job;
}

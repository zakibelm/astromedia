// =====================================
// FACEBOOK AUTO-REPLY QUEUE
// =====================================
// Handles Facebook Page messages and comments

import { Queue, Worker, Job } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from './config';
import { PrismaClient } from '@prisma/client';
import { runLLM } from '../../../services/llmRouter';

const prisma = new PrismaClient();

// =====================================
// TYPES
// =====================================

interface FacebookMessageData {
  messageId: string;
  senderId: string;
  messageText: string;
  timestamp: string;
  platform: 'facebook';
}

interface FacebookJobResult {
  success: boolean;
  reply?: string;
  sentiment?: string;
  error?: string;
}

// =====================================
// QUEUE DEFINITION
// =====================================

export const facebookQueue = new Queue<FacebookMessageData>('facebook', defaultQueueOptions);

// =====================================
// JOB PROCESSOR
// =====================================

async function processFacebookMessage(job: Job<FacebookMessageData>): Promise<FacebookJobResult> {
  const { messageId, senderId, messageText, timestamp } = job.data;
  const startTime = Date.now();

  try {
    await job.updateProgress(10);

    // Step 1: Analyze sentiment
    console.log(`[Facebook Queue] Analyzing sentiment for message ${messageId}`);

    const sentimentResult = await runLLM({
      agent: 'sentiment-analyzer',
      input: `Analyze the sentiment of this message: "${messageText}"`,
      systemInstruction: 'You are a sentiment analyzer. Respond with only one word: positive, neutral, or negative.',
      criteria: 'cost',
    });

    const sentiment = sentimentResult.response?.choices?.[0]?.message?.content?.toLowerCase().trim() || 'neutral';
    await job.updateProgress(40);

    // Step 2: Generate reply
    console.log(`[Facebook Queue] Generating reply for message ${messageId} (sentiment: ${sentiment})`);

    const replyResult = await runLLM({
      agent: 'facebook-responder',
      input: messageText,
      systemInstruction: `Tu es un assistant marketing pour un restaurant québécois.
Réponds aux messages Facebook de façon amicale, professionnelle et en français.
Garde les réponses courtes (max 100 mots).

Le sentiment du message est: ${sentiment}

${sentiment === 'negative' ? 'Le client semble insatisfait. Sois empathique et propose une solution.' : ''}
${sentiment === 'positive' ? 'Le client est content. Remercie-le chaleureusement.' : ''}
`,
      criteria: 'balanced',
    });

    const reply = replyResult.response?.choices?.[0]?.message?.content || 'Merci pour votre message!';
    const aiCost = (sentimentResult.cost || 0) + (replyResult.cost || 0);

    await job.updateProgress(70);

    // Step 3: Save to database
    console.log(`[Facebook Queue] Saving interaction to database`);

    await prisma.socialInteraction.create({
      data: {
        platform: 'facebook',
        messageId,
        senderId,
        messageText,
        replyText: reply,
        sentiment,
        aiCost,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date(timestamp),
      },
    });

    await job.updateProgress(90);

    // Step 4: Send reply via Facebook API
    console.log(`[Facebook Queue] Sending reply via Facebook API`);
    await sendFacebookReply(senderId, reply);

    await job.updateProgress(95);

    // Step 5: Update lead score
    console.log(`[Facebook Queue] Updating lead score`);
    await updateLeadScore(senderId, 'facebook');

    await job.updateProgress(100);

    console.log(`[Facebook Queue] ✓ Completed message ${messageId} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      reply,
      sentiment,
    };

  } catch (error: any) {
    console.error(`[Facebook Queue] ✗ Error processing message ${messageId}:`, error);

    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

async function sendFacebookReply(recipientId: string, reply: string): Promise<void> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('[Facebook Queue] No Facebook access token configured, skipping actual send');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: reply },
          access_token: accessToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status} ${response.statusText}`);
    }

    console.log(`[Facebook Queue] ✓ Reply sent successfully`);
  } catch (error: any) {
    console.error(`[Facebook Queue] Failed to send Facebook reply:`, error);
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
          increment: 5,
        },
        lastInteraction: new Date(),
      },
      create: {
        platformUserId: `${platform}:${senderId}`,
        platform,
        totalInteractions: 1,
        engagementScore: 5,
        leadStatus: 'new',
        lastInteraction: new Date(),
      },
    });

    console.log(`[Facebook Queue] ✓ Lead score updated for ${senderId}`);
  } catch (error: any) {
    console.error(`[Facebook Queue] Failed to update lead score:`, error);
  }
}

// =====================================
// WORKER
// =====================================

export const facebookWorker = new Worker<FacebookMessageData, FacebookJobResult>(
  'facebook',
  processFacebookMessage,
  {
    ...defaultWorkerOptions,
    concurrency: 3,
  }
);

// Event listeners
facebookWorker.on('completed', (job) => {
  console.log(`[Facebook Worker] Job ${job.id} completed`);
});

facebookWorker.on('failed', (job, err) => {
  console.error(`[Facebook Worker] Job ${job?.id} failed:`, err);
});

facebookWorker.on('error', (err) => {
  console.error('[Facebook Worker] Worker error:', err);
});

// =====================================
// HELPER: Add job to queue
// =====================================

export async function queueFacebookMessage(data: FacebookMessageData) {
  const job = await facebookQueue.add('facebook-reply', data, {
    jobId: `facebook-${data.messageId}`,
  });

  console.log(`[Facebook Queue] Job ${job.id} queued for message ${data.messageId}`);

  return job;
}

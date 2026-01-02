// =====================================
// INSTAGRAM AUTO-REPLY QUEUE
// =====================================
// Replaces n8n instagram-auto-reply workflow

import { Queue, Worker, Job } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from './config';
import { PrismaClient } from '@prisma/client';
import { runLLM } from '../services/llm/llmRouter';

const prisma = new PrismaClient();

// =====================================
// TYPES
// =====================================

interface InstagramMessageData {
  messageId: string;
  senderId: string;
  messageText: string;
  timestamp: string;
}

interface InstagramJobResult {
  success: boolean;
  reply?: string;
  sentiment?: string;
  error?: string;
}

// =====================================
// QUEUE DEFINITION
// =====================================

export const instagramQueue = new Queue<InstagramMessageData>('instagram', defaultQueueOptions);

// =====================================
// JOB PROCESSOR
// =====================================

async function processInstagramMessage(job: Job<InstagramMessageData>): Promise<InstagramJobResult> {
  const { messageId, senderId, messageText, timestamp } = job.data;
  const startTime = Date.now();

  try {
    await job.updateProgress(10);

    // Step 1: Analyze sentiment
    console.log(`[Instagram Queue] Analyzing sentiment for message ${messageId}`);

    const sentimentResult = await runLLM({
      agent: 'sentiment-analyzer',
      input: `Analyze the sentiment of this message: "${messageText}"`,
      systemInstruction: 'You are a sentiment analyzer. Respond with only one word: positive, neutral, or negative.',
      criteria: 'cost', // Use cheapest model for sentiment
    });

    const sentiment = sentimentResult.response?.choices?.[0]?.message?.content?.toLowerCase().trim() || 'neutral';
    await job.updateProgress(40);

    // Step 2: Generate reply
    console.log(`[Instagram Queue] Generating reply for message ${messageId} (sentiment: ${sentiment})`);

    const replyResult = await runLLM({
      agent: 'instagram-responder',
      input: messageText,
      systemInstruction: `Tu es un assistant marketing pour un restaurant québécois.
Réponds aux commentaires Instagram de façon amicale, professionnelle et en français.
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
    console.log(`[Instagram Queue] Saving interaction to database`);

    await prisma.socialInteraction.create({
      data: {
        platform: 'instagram',
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

    // Step 4: Send reply via Instagram API
    console.log(`[Instagram Queue] Sending reply via Instagram API`);
    await sendInstagramReply(messageId, reply);

    await job.updateProgress(95);

    // Step 5: Update lead score
    console.log(`[Instagram Queue] Updating lead score`);
    await updateLeadScore(senderId);

    await job.updateProgress(100);

    console.log(`[Instagram Queue] ✓ Completed message ${messageId} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      reply,
      sentiment,
    };

  } catch (error: any) {
    console.error(`[Instagram Queue] ✗ Error processing message ${messageId}:`, error);

    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

async function sendInstagramReply(messageId: string, reply: string): Promise<void> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('[Instagram Queue] No Instagram access token configured, skipping actual send');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/v18.0/${messageId}/replies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: reply,
          access_token: accessToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status} ${response.statusText}`);
    }

    console.log(`[Instagram Queue] ✓ Reply sent successfully`);
  } catch (error: any) {
    console.error(`[Instagram Queue] Failed to send Instagram reply:`, error);
    throw error;
  }
}

async function updateLeadScore(senderId: string): Promise<void> {
  try {
    // Upsert lead profile
    await prisma.leadProfile.upsert({
      where: {
        platformUserId: `instagram:${senderId}`,
      },
      update: {
        totalInteractions: {
          increment: 1,
        },
        engagementScore: {
          increment: 5, // +5 points per interaction
        },
        lastInteraction: new Date(),
      },
      create: {
        platformUserId: `instagram:${senderId}`,
        platform: 'instagram',
        totalInteractions: 1,
        engagementScore: 5,
        leadStatus: 'NEW',
        lastInteraction: new Date(),
      },
    });

    console.log(`[Instagram Queue] ✓ Lead score updated for ${senderId}`);
  } catch (error: any) {
    console.error(`[Instagram Queue] Failed to update lead score:`, error);
    // Don't throw - this is not critical
  }
}

// =====================================
// WORKER
// =====================================

export const instagramWorker = new Worker<InstagramMessageData, InstagramJobResult>(
  'instagram',
  processInstagramMessage,
  {
    ...defaultWorkerOptions,
    concurrency: 3, // Process up to 3 Instagram messages concurrently
  }
);

// Event listeners
instagramWorker.on('completed', (job) => {
  console.log(`[Instagram Worker] Job ${job.id} completed`);
});

instagramWorker.on('failed', (job, err) => {
  console.error(`[Instagram Worker] Job ${job?.id} failed:`, err);
});

instagramWorker.on('error', (err) => {
  console.error('[Instagram Worker] Worker error:', err);
});

// =====================================
// HELPER: Add job to queue
// =====================================

export async function queueInstagramMessage(data: InstagramMessageData) {
  const job = await instagramQueue.add('instagram-reply', data, {
    jobId: `instagram-${data.messageId}`, // Deduplicate by message ID
  });

  console.log(`[Instagram Queue] Job ${job.id} queued for message ${data.messageId}`);

  return job;
}

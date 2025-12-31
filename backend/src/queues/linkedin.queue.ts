// =====================================
// LINKEDIN AUTO-REPLY QUEUE
// =====================================
// Handles LinkedIn messages and post comments

import { Queue, Worker, Job } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from './config';
import { PrismaClient } from '@prisma/client';
import { runLLM } from '../../../services/llmRouter';

const prisma = new PrismaClient();

// =====================================
// TYPES
// =====================================

interface LinkedInMessageData {
  messageId: string;
  senderId: string;
  messageText: string;
  timestamp: string;
  platform: 'linkedin';
}

interface LinkedInJobResult {
  success: boolean;
  reply?: string;
  sentiment?: string;
  error?: string;
}

// =====================================
// QUEUE DEFINITION
// =====================================

export const linkedinQueue = new Queue<LinkedInMessageData>('linkedin', defaultQueueOptions);

// =====================================
// JOB PROCESSOR
// =====================================

async function processLinkedInMessage(job: Job<LinkedInMessageData>): Promise<LinkedInJobResult> {
  const { messageId, senderId, messageText, timestamp } = job.data;
  const startTime = Date.now();

  try {
    await job.updateProgress(10);

    // Step 1: Analyze sentiment
    console.log(`[LinkedIn Queue] Analyzing sentiment for message ${messageId}`);

    const sentimentResult = await runLLM({
      agent: 'sentiment-analyzer',
      input: `Analyze the sentiment of this message: "${messageText}"`,
      systemInstruction: 'You are a sentiment analyzer. Respond with only one word: positive, neutral, or negative.',
      criteria: 'cost',
    });

    const sentiment = sentimentResult.response?.choices?.[0]?.message?.content?.toLowerCase().trim() || 'neutral';
    await job.updateProgress(40);

    // Step 2: Generate reply (more professional tone for LinkedIn)
    console.log(`[LinkedIn Queue] Generating reply for message ${messageId} (sentiment: ${sentiment})`);

    const replyResult = await runLLM({
      agent: 'linkedin-responder',
      input: messageText,
      systemInstruction: `Tu es un assistant marketing pour un restaurant québécois.
Réponds aux messages LinkedIn de façon professionnelle et en français.
Ton professionnel et courtois, adapté au réseau professionnel.
Garde les réponses courtes (max 120 mots).

Le sentiment du message est: ${sentiment}

${sentiment === 'negative' ? 'Sois très professionnel et propose une solution constructive.' : ''}
${sentiment === 'positive' ? 'Remercie professionnellement et invite à la collaboration.' : ''}
`,
      criteria: 'balanced',
    });

    const reply = replyResult.response?.choices?.[0]?.message?.content || 'Merci pour votre message.';
    const aiCost = (sentimentResult.cost || 0) + (replyResult.cost || 0);

    await job.updateProgress(70);

    // Step 3: Save to database
    console.log(`[LinkedIn Queue] Saving interaction to database`);

    await prisma.socialInteraction.create({
      data: {
        platform: 'linkedin',
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

    // Step 4: Send reply via LinkedIn API
    console.log(`[LinkedIn Queue] Sending reply via LinkedIn API`);
    await sendLinkedInReply(messageId, reply);

    await job.updateProgress(95);

    // Step 5: Update lead score (LinkedIn leads are higher value - B2B)
    console.log(`[LinkedIn Queue] Updating lead score`);
    await updateLeadScore(senderId, 'linkedin');

    await job.updateProgress(100);

    console.log(`[LinkedIn Queue] ✓ Completed message ${messageId} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      reply,
      sentiment,
    };

  } catch (error: any) {
    console.error(`[LinkedIn Queue] ✗ Error processing message ${messageId}:`, error);

    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

async function sendLinkedInReply(messageUrn: string, reply: string): Promise<void> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('[LinkedIn Queue] No LinkedIn access token configured, skipping actual send');
    return;
  }

  try {
    const response = await fetch(
      `https://api.linkedin.com/v2/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messageUrn,
          message: reply,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    }

    console.log(`[LinkedIn Queue] ✓ Reply sent successfully`);
  } catch (error: any) {
    console.error(`[LinkedIn Queue] Failed to send LinkedIn reply:`, error);
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
          increment: 10, // LinkedIn leads are worth 2x more (B2B)
        },
        lastInteraction: new Date(),
      },
      create: {
        platformUserId: `${platform}:${senderId}`,
        platform,
        totalInteractions: 1,
        engagementScore: 10,
        leadStatus: 'new',
        lastInteraction: new Date(),
      },
    });

    console.log(`[LinkedIn Queue] ✓ Lead score updated for ${senderId}`);
  } catch (error: any) {
    console.error(`[LinkedIn Queue] Failed to update lead score:`, error);
  }
}

// =====================================
// WORKER
// =====================================

export const linkedinWorker = new Worker<LinkedInMessageData, LinkedInJobResult>(
  'linkedin',
  processLinkedInMessage,
  {
    ...defaultWorkerOptions,
    concurrency: 3,
  }
);

// Event listeners
linkedinWorker.on('completed', (job) => {
  console.log(`[LinkedIn Worker] Job ${job.id} completed`);
});

linkedinWorker.on('failed', (job, err) => {
  console.error(`[LinkedIn Worker] Job ${job?.id} failed:`, err);
});

linkedinWorker.on('error', (err) => {
  console.error('[LinkedIn Worker] Worker error:', err);
});

// =====================================
// HELPER: Add job to queue
// =====================================

export async function queueLinkedInMessage(data: LinkedInMessageData) {
  const job = await linkedinQueue.add('linkedin-reply', data, {
    jobId: `linkedin-${data.messageId}`,
  });

  console.log(`[LinkedIn Queue] Job ${job.id} queued for message ${data.messageId}`);

  return job;
}

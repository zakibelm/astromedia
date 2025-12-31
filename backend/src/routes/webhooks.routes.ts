// =====================================
// WEBHOOK ROUTES
// =====================================
// Receives webhooks from external services (Instagram, etc.)

import { Router } from 'express';
import { createHmac } from 'crypto';
import { queueInstagramMessage } from '../queues';

const router = Router();

// =====================================
// HELPER: Verify Instagram Signature
// =====================================
function verifyInstagramSignature(payload: string, signature: string | undefined, secret: string): boolean {
  if (!signature) {
    return false;
  }

  // Instagram sends signature as 'sha256=<hash>'
  const expectedSignature = 'sha256=' + createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

// =====================================
// INSTAGRAM WEBHOOK
// =====================================

router.post('/instagram', async (req, res) => {
  try {
    const payload = req.body;

    // Verify webhook signature (Instagram requirement)
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;

    if (appSecret) {
      const rawBody = JSON.stringify(payload);
      if (!verifyInstagramSignature(rawBody, signature, appSecret)) {
        console.warn('[Webhook] Invalid Instagram signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('[Webhook] INSTAGRAM_APP_SECRET not configured, skipping signature verification');
    }

    // Parse Instagram webhook payload
    const entry = payload.entry?.[0];
    const messaging = entry?.messaging?.[0];
    const message = messaging?.message;

    if (!message) {
      return res.status(200).json({ status: 'ignored', reason: 'Not a message event' });
    }

    const messageData = {
      messageId: message.mid,
      senderId: messaging.sender.id,
      messageText: message.text,
      timestamp: new Date(entry.time).toISOString(),
    };

    // Queue the message for processing
    const job = await queueInstagramMessage(messageData);

    res.status(200).json({
      status: 'queued',
      jobId: job.id,
      messageId: messageData.messageId,
    });

  } catch (error: any) {
    console.error('[Webhook] Instagram webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Instagram webhook verification (required for setup)
router.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || 'astromedia_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Instagram webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Invalid verification token' });
  }
});

export default router;

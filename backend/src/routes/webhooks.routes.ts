// =====================================
// WEBHOOK ROUTES
// =====================================
// Receives webhooks from external services (Instagram, etc.)

import { Router } from 'express';
import { createHmac } from 'crypto';
import {
  queueInstagramMessage,
  queueFacebookMessage,
  queueLinkedInMessage,
  queueTikTokMessage,
  queueTwitterMessage
} from '../queues';

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

// =====================================
// FACEBOOK WEBHOOK
// =====================================

router.post('/facebook', async (req, res) => {
  try {
    const payload = req.body;

    // Verify webhook signature (Facebook requirement)
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (appSecret) {
      const rawBody = JSON.stringify(payload);
      if (!verifyInstagramSignature(rawBody, signature, appSecret)) {
        console.warn('[Webhook] Invalid Facebook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Parse Facebook webhook payload (similar structure to Instagram)
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
      platform: 'facebook' as const,
    };

    const job = await queueFacebookMessage(messageData);

    res.status(200).json({
      status: 'queued',
      jobId: job.id,
      messageId: messageData.messageId,
    });

  } catch (error: any) {
    console.error('[Webhook] Facebook webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Facebook webhook verification
router.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'astromedia_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Facebook webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Invalid verification token' });
  }
});

// =====================================
// LINKEDIN WEBHOOK
// =====================================

router.post('/linkedin', async (req, res) => {
  try {
    const payload = req.body;

    // LinkedIn uses different webhook format
    const eventType = payload.eventType;

    if (eventType !== 'MESSAGE_RECEIVED') {
      return res.status(200).json({ status: 'ignored', reason: 'Not a message event' });
    }

    const messageData = {
      messageId: payload.eventId || payload.id,
      senderId: payload.from?.id || payload.actor,
      messageText: payload.message?.text || payload.content,
      timestamp: new Date(payload.timestamp || Date.now()).toISOString(),
      platform: 'linkedin' as const,
    };

    const job = await queueLinkedInMessage(messageData);

    res.status(200).json({
      status: 'queued',
      jobId: job.id,
      messageId: messageData.messageId,
    });

  } catch (error: any) {
    console.error('[Webhook] LinkedIn webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// TIKTOK WEBHOOK
// =====================================

router.post('/tiktok', async (req, res) => {
  try {
    const payload = req.body;

    // TikTok webhook verification
    const signature = req.headers['x-tiktok-signature'] as string | undefined;
    const timestamp = req.headers['x-tiktok-timestamp'] as string | undefined;

    // Parse TikTok webhook payload
    const event = payload.event;
    const type = event?.type; // 'comment' or 'direct_message'

    if (!['comment', 'direct_message'].includes(type)) {
      return res.status(200).json({ status: 'ignored', reason: 'Not a supported event type' });
    }

    const messageData = {
      messageId: event.id,
      senderId: event.from_user?.id,
      messageText: event.text || event.content,
      timestamp: new Date(event.create_time * 1000).toISOString(),
      platform: 'tiktok' as const,
      type: type === 'comment' ? 'comment' as const : 'dm' as const,
    };

    const job = await queueTikTokMessage(messageData);

    res.status(200).json({
      status: 'queued',
      jobId: job.id,
      messageId: messageData.messageId,
    });

  } catch (error: any) {
    console.error('[Webhook] TikTok webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// X (TWITTER) WEBHOOK
// =====================================

router.post('/twitter', async (req, res) => {
  try {
    const payload = req.body;

    // X/Twitter uses CRC verification, handled separately

    // Parse Twitter webhook payload
    const eventType = Object.keys(payload)[0]; // 'tweet_create_events', 'direct_message_events', etc.

    let messageData;

    if (eventType === 'direct_message_events') {
      const dmEvent = payload.direct_message_events?.[0];
      messageData = {
        messageId: dmEvent.id,
        senderId: dmEvent.message_create?.sender_id,
        messageText: dmEvent.message_create?.message_data?.text,
        timestamp: new Date(parseInt(dmEvent.created_timestamp)).toISOString(),
        platform: 'twitter' as const,
        type: 'dm' as const,
      };
    } else if (eventType === 'tweet_create_events') {
      const tweet = payload.tweet_create_events?.[0];

      // Check if it's a mention or reply
      const isMention = tweet.entities?.user_mentions?.length > 0;
      const isReply = tweet.in_reply_to_status_id !== null;

      messageData = {
        messageId: tweet.id_str,
        senderId: tweet.user?.id_str,
        messageText: tweet.text,
        timestamp: new Date(tweet.created_at).toISOString(),
        platform: 'twitter' as const,
        type: (isReply ? 'reply' : 'mention') as const,
      };
    } else {
      return res.status(200).json({ status: 'ignored', reason: 'Not a supported event type' });
    }

    const job = await queueTwitterMessage(messageData);

    res.status(200).json({
      status: 'queued',
      jobId: job.id,
      messageId: messageData.messageId,
    });

  } catch (error: any) {
    console.error('[Webhook] Twitter webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Twitter CRC verification (required for setup)
router.get('/twitter', (req, res) => {
  const crc_token = req.query.crc_token as string;

  if (!crc_token) {
    return res.status(400).json({ error: 'Missing crc_token' });
  }

  const consumerSecret = process.env.TWITTER_API_SECRET || '';
  const responseToken = createHmac('sha256', consumerSecret)
    .update(crc_token)
    .digest('base64');

  res.status(200).json({
    response_token: `sha256=${responseToken}`,
  });
});

export default router;

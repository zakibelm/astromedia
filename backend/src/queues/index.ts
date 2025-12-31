// =====================================
// QUEUE EXPORTS
// =====================================

// All social media platform queues
export { instagramQueue, instagramWorker, queueInstagramMessage } from './instagram.queue';
export { facebookQueue, facebookWorker, queueFacebookMessage } from './facebook.queue';
export { linkedinQueue, linkedinWorker, queueLinkedInMessage } from './linkedin.queue';
export { tiktokQueue, tiktokWorker, queueTikTokMessage } from './tiktok.queue';
export { twitterQueue, twitterWorker, queueTwitterMessage } from './twitter.queue';

// Queue configuration
export { connection, defaultQueueOptions, defaultWorkerOptions } from './config';

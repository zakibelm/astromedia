// =====================================
// WORKER PROCESS
// =====================================
// Starts all BullMQ workers for social media automation
// Run this in a separate process: npm run worker

import {
  instagramWorker,
  facebookWorker,
  linkedinWorker,
  tiktokWorker,
  twitterWorker,
} from './queues';

console.log('🚀 Starting AstroMedia Workers...');
console.log('');
console.log('Active Workers:');
console.log('  • Instagram Auto-Reply');
console.log('  • Facebook Auto-Reply');
console.log('  • LinkedIn Auto-Reply');
console.log('  • TikTok Auto-Reply');
console.log('  • X (Twitter) Auto-Reply');
console.log('');

// Worker health monitoring
const workers = [
  { name: 'Instagram', worker: instagramWorker },
  { name: 'Facebook', worker: facebookWorker },
  { name: 'LinkedIn', worker: linkedinWorker },
  { name: 'TikTok', worker: tiktokWorker },
  { name: 'Twitter', worker: twitterWorker },
];

// Log worker status
workers.forEach(({ name, worker }) => {
  worker.on('ready', () => {
    console.log(`✓ ${name} worker ready`);
  });

  worker.on('active', (job) => {
    console.log(`[${name}] Processing job ${job.id}`);
  });
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down workers gracefully...');

  await Promise.all([
    instagramWorker.close(),
    facebookWorker.close(),
    linkedinWorker.close(),
    tiktokWorker.close(),
    twitterWorker.close(),
  ]);

  console.log('✓ All workers closed');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('✓ All workers started successfully');
console.log('Waiting for jobs...');

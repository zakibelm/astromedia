// =====================================
// WORKER PROCESS
// =====================================
// Starts all BullMQ workers
// Run this in a separate process: npm run worker

import { instagramWorker } from './queues';

console.log('🚀 Starting AstroMedia Workers...');
console.log('');
console.log('Active Workers:');
console.log('  • Instagram Auto-Reply');
console.log('');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...');
  await instagramWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing workers...');
  await instagramWorker.close();
  process.exit(0);
});

console.log('✓ Workers started successfully');
console.log('Waiting for jobs...');

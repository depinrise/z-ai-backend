import app from '../server';
import { createServer } from 'http';
import { parse } from 'url';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = createServer(app);
  const parsedUrl = parse(req.url!, true);
  server.emit('request', req as any, res as any);
} 
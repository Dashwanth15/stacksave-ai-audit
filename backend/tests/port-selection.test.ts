import { describe, expect, it } from 'vitest';
import { createServer } from 'node:net';

import { findAvailablePort } from '../src/utils/port';

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

describe('findAvailablePort', () => {
  it('moves to the next port when the preferred port is already occupied', async () => {
    const preferredPort = await getFreePort();
    const occupiedServer = createServer();

    await new Promise<void>((resolve, reject) => {
      occupiedServer.once('error', reject);
      occupiedServer.listen(preferredPort, '127.0.0.1', () => resolve());
    });

    try {
      const nextPort = await findAvailablePort(preferredPort);
      expect(nextPort).toBeGreaterThan(preferredPort);
    } finally {
      await new Promise<void>((resolve, reject) => {
        occupiedServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });
});

import { createServer } from 'node:net';

export async function findAvailablePort(preferredPort: number): Promise<number> {
  let candidatePort = preferredPort;

  for (let attempts = 0; attempts < 20; attempts += 1) {
    const isAvailable = await new Promise<boolean>((resolve) => {
      const server = createServer();

      server.once('error', () => resolve(false));
      server.listen(candidatePort, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });

    if (isAvailable) {
      return candidatePort;
    }

    candidatePort += 1;
  }

  throw new Error(`Unable to find an available port starting from ${preferredPort}`);
}

import { createServer } from 'node:net';

function isPortAvailable(port: number, host?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function findAvailablePort(preferredPort: number): Promise<number> {
  let candidatePort = preferredPort;

  for (let attempts = 0; attempts < 20; attempts += 1) {
    const available127 = await isPortAvailable(candidatePort, '127.0.0.1');
    const availableDefault = await isPortAvailable(candidatePort);

    if (available127 && availableDefault) {
      return candidatePort;
    }

    candidatePort += 1;
  }

  throw new Error(`Unable to find an available port starting from ${preferredPort}`);
}

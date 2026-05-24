import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const readRequestBody = (request: import('node:http').IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    request.on('error', reject);
  });

const localNetlifyFunctions = () => ({
  name: 'local-netlify-functions',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use(async (request, response, next) => {
      const requestUrl = request.url ?? '';
      const match = requestUrl.match(/^\/\.netlify\/functions\/([A-Za-z0-9_-]+)(?:[?#].*)?$/);
      if (!match) {
        next();
        return;
      }

      const functionName = match[1];
      try {
        const mod = await server.ssrLoadModule(`/netlify/functions/${functionName}.ts`);
        if (typeof mod.handler !== 'function') {
          response.statusCode = 404;
          response.end(JSON.stringify({ error: `Function "${functionName}" was not found.` }));
          return;
        }

        const body = await readRequestBody(request);
        const result = await mod.handler({
          httpMethod: request.method ?? 'GET',
          body: body || null,
          headers: request.headers,
        });

        response.statusCode = result.statusCode ?? 200;
        for (const [key, value] of Object.entries(result.headers ?? {})) {
          response.setHeader(key, String(value));
        }
        response.end(result.body ?? '');
      } catch (error) {
        server.config.logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
        response.statusCode = 500;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(JSON.stringify({ error: `Function "${functionName}" failed locally.` }));
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), localNetlifyFunctions()],
});

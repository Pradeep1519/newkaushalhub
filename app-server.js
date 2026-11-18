const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname);
const DEFAULT_DATA_DIR = path.join(ROOT, 'data');
const MAX_BODY_BYTES = 16 * 1024;
const STATIC_FILES = new Set([
  'about.html',
  'admin.html',
  'campus-impact.html',
  'contact.html',
  'events.html',
  'index.html',
  'institutions.html',
  'kaushalhub-logo.svg',
  'partnerships.html',
  'register.html',
  'script.js',
  'styles.css'
]);
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const formSchemas = {
  registration: {
    required: ['fullName', 'mobile', 'whatsapp', 'email', 'college', 'course', 'year', 'cityState', 'workshop'],
    optional: ['consent'],
    emailField: 'email'
  },
  contact: {
    required: ['name', 'email', 'phone', 'topic', 'message'],
    emailField: 'email'
  },
  institution: {
    required: [
      'institutionName', 'contactPerson', 'designation', 'officialEmail', 'mobile',
      'cityState', 'expectedParticipation', 'workshop', 'duration', 'dates', 'deliveryMode'
    ],
    optional: ['budgetRange', 'requirements'],
    emailField: 'officialEmail'
  },
  partnership: {
    required: [
      'organizationName', 'contactPerson', 'designation', 'email', 'mobile',
      'category', 'location'
    ],
    optional: ['amount', 'outcomes', 'requirements'],
    emailField: 'email'
  }
};

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let byteLength = 0;

  for await (const chunk of request) {
    byteLength += chunk.length;
    if (byteLength > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

function validateSubmission(type, payload) {
  const schema = formSchemas[type];
  if (!schema) {
    return { error: 'Select a valid enquiry type.' };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'Submission must be a JSON object.' };
  }

  const fields = {};
  const errors = [];
  const allowedFields = [...schema.required, ...(schema.optional || [])];

  for (const field of allowedFields) {
    const value = payload[field];
    if (value === undefined && (schema.optional || []).includes(field)) {
      continue;
    }
    if (typeof value !== 'string') {
      errors.push(`${field} must be text.`);
      continue;
    }

    const normalized = value.trim();
    if (schema.required.includes(field) && !normalized) {
      errors.push(`${field} is required.`);
    } else if (normalized.length > 2000) {
      errors.push(`${field} must be 2000 characters or fewer.`);
    } else {
      fields[field] = normalized;
    }
  }

  const email = fields[schema.emailField];
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Enter a valid email address.');
  }

  return errors.length ? { error: errors.join(' ') } : { fields };
}

function createSubmissionWriter(dataDir) {
  const dataFile = path.join(dataDir, 'submissions.json');
  let writeQueue = Promise.resolve();

  return (record) => {
    const write = writeQueue.then(async () => {
      await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });

      let submissions = [];
      try {
        submissions = JSON.parse(await fs.readFile(dataFile, 'utf8'));
        if (!Array.isArray(submissions)) {
          throw new Error('Submission store must contain a JSON array.');
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      submissions.push(record);
      const tempFile = path.join(dataDir, `submissions-${crypto.randomUUID()}.tmp`);
      try {
        await fs.writeFile(tempFile, JSON.stringify(submissions, null, 2), {
          encoding: 'utf8',
          flag: 'wx',
          mode: 0o600
        });
        await fs.rename(tempFile, dataFile);
        await fs.chmod(dataFile, 0o600);
      } catch (error) {
        await fs.rm(tempFile, { force: true });
        throw error;
      }
    });

    writeQueue = write.then(() => undefined, () => undefined);
    return write;
  };
}

function serveStaticFile(request, response, pathname, root) {
  const filename = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!STATIC_FILES.has(filename)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const filePath = path.join(root, filename);
  fs.readFile(filePath).then((content) => {
    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Length': content.length,
      'Content-Type': CONTENT_TYPES[path.extname(filename)]
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  }).catch((error) => {
    if (error.code === 'ENOENT') {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    console.error('Failed to serve website file:', error);
    response.writeHead(500);
    response.end('Unable to serve this page.');
  });
}

function createServer({ dataDir = DEFAULT_DATA_DIR, root = ROOT } = {}) {
  const saveSubmission = createSubmissionWriter(dataDir);
  const websiteRoot = path.resolve(root);

  return http.createServer(async (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      jsonResponse(response, 400, { error: 'Invalid request URL.' });
      return;
    }

    if (pathname === '/api/health' && request.method === 'GET') {
      jsonResponse(response, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/registrations' || pathname === '/api/enquiries') {
      if (request.method !== 'POST') {
        response.writeHead(405, { Allow: 'POST' });
        response.end('Method not allowed');
        return;
      }
      const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
      if (contentType !== 'application/json') {
        jsonResponse(response, 415, { error: 'Content-Type must be application/json.' });
        return;
      }

      try {
        const payload = await readJsonBody(request);
        const isRegistration = pathname === '/api/registrations';
        const type = isRegistration ? 'registration' : payload?.type;
        const validation = validateSubmission(type, payload);
        if (validation.error) {
          jsonResponse(response, 422, { error: validation.error });
          return;
        }

        const record = {
          id: crypto.randomUUID(),
          type,
          fields: validation.fields,
          submittedAt: new Date().toISOString()
        };
        if (isRegistration) {
          record.registrationId = `KH-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          record.paymentStatus = 'pending';
        }

        await saveSubmission(record);
        jsonResponse(response, 201, isRegistration
          ? { registrationId: record.registrationId, paymentStatus: record.paymentStatus }
          : { message: 'Enquiry received.' });
      } catch (error) {
        if (error.statusCode) {
          jsonResponse(response, error.statusCode, { error: error.message });
          return;
        }
        console.error('Failed to save form submission:', error);
        jsonResponse(response, 500, { error: 'Submission could not be saved. Please try again later.' });
      }
      return;
    }

    if (pathname.startsWith('/api/')) {
      jsonResponse(response, 404, { error: 'API route not found.' });
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }

    serveStaticFile(request, response, pathname, websiteRoot);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port number.');
  }

  const server = createServer();
  server.listen(port, host, () => {
    const address = server.address();
    console.log(`KaushalHub is running at http://${host}:${address.port}`);
  });
}

const vercelServer = createServer();
vercelServer.createServer = createServer;
vercelServer.STATIC_FILES = [...STATIC_FILES];
module.exports = vercelServer;

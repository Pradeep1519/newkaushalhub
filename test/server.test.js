const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, it } = require('node:test');
const { createServer } = require('../server');

describe('Node.js website server', () => {
  let dataDir;
  let server;
  let baseUrl;

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kaushalhub-test-'));
    server = createServer({ dataDir });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  it('exports an HTTP server for Vercel', () => {
    const app = require('../server');
    assert.ok(app instanceof http.Server);
    assert.equal(typeof app.createServer, 'function');
  });

  afterEach(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('serves the home page and health endpoint', async () => {
    const [page, health] = await Promise.all([
      fetch(baseUrl),
      fetch(`${baseUrl}/api/health`)
    ]);

    assert.equal(page.status, 200);
    assert.match(await page.text(), /KaushalHub NaukriPath/);
    assert.deepEqual(await health.json(), { status: 'ok' });
  });

  it('persists valid student registrations as unpaid', async () => {
    const response = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'A Learner',
        mobile: '9876543210',
        whatsapp: '9876543210',
        email: 'learner@example.com',
        college: 'Example College',
        course: 'Computer Science',
        year: '2nd Year',
        cityState: 'Noida, UP',
        workshop: 'AI Awareness & Future of AI',
        consent: 'yes'
      })
    });
    const result = await response.json();
    const saved = JSON.parse(await fs.readFile(path.join(dataDir, 'submissions.json'), 'utf8'));

    assert.equal(response.status, 201);
    assert.match(result.registrationId, /^KH-\d{4}-[A-F0-9]{8}$/);
    assert.equal(result.paymentStatus, 'pending');
    assert.equal(saved.length, 1);
    assert.equal(saved[0].fields.email, 'learner@example.com');
    assert.equal(saved[0].paymentStatus, 'pending');
  });

  it('saves contact, institutional, and partnership enquiries', async () => {
    const enquiries = [
      {
        type: 'contact',
        name: 'Learner',
        email: 'learner@example.com',
        phone: '9876543210',
        topic: 'Student enquiry',
        message: 'Please share workshop details.'
      },
      {
        type: 'institution',
        institutionName: 'Example College',
        contactPerson: 'A Contact',
        designation: 'Coordinator',
        officialEmail: 'contact@example.edu',
        mobile: '9876543210',
        cityState: 'Noida, UP',
        expectedParticipation: '100',
        workshop: 'Generative AI Workshop',
        duration: '2 days',
        dates: 'Flexible',
        deliveryMode: 'Offline'
      },
      {
        type: 'partnership',
        organizationName: 'Example Organization',
        contactPerson: 'A Contact',
        designation: 'Manager',
        email: 'contact@example.com',
        mobile: '9876543210',
        category: 'Corporate Sponsorship',
        location: 'Noida'
      }
    ];

    const responses = await Promise.all(enquiries.map((enquiry) => fetch(`${baseUrl}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiry)
    })));
    const saved = JSON.parse(await fs.readFile(path.join(dataDir, 'submissions.json'), 'utf8'));

    assert.deepEqual(responses.map((response) => response.status), [201, 201, 201]);
    assert.deepEqual(saved.map((record) => record.type), ['contact', 'institution', 'partnership']);
  });

  it('rejects invalid enquiries without creating a submission', async () => {
    const response = await fetch(`${baseUrl}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contact',
        name: 'Learner',
        email: 'not-an-email',
        phone: '9876543210',
        topic: 'Student enquiry',
        message: 'Please share details.'
      })
    });

    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /valid email/);
    await assert.rejects(fs.access(path.join(dataDir, 'submissions.json')));
  });

  it('does not serve server code or saved submission files', async () => {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, 'submissions.json'), '[]');
    const [source, submissions] = await Promise.all([
      fetch(`${baseUrl}/server.js`),
      fetch(`${baseUrl}/data/submissions.json`)
    ]);

    assert.equal(source.status, 404);
    assert.equal(submissions.status, 404);
  });
});

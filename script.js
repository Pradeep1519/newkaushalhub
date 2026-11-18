const workshops = [
  {
    name: 'AI Awareness & Future of AI',
    duration: '1 Day',
    audience: 'Students, beginners & curious teams',
    description: 'A clear roadmap for understanding AI, its use across sectors, and future career opportunities.',
    topics: ['AI foundations and evolution', 'Industry applications', 'Generative AI demonstrations', 'Career pathways'],
    price: 'Enquire',
    tag: 'Foundation'
  },
  {
    name: 'AI for Entrepreneurship – From Idea to First Customer',
    duration: '1–2 Days',
    audience: 'Founders & early-stage builders',
    description: 'Use AI to discover problems, validate ideas, and develop a scalable business prototype.',
    topics: ['AI-assisted idea generation', 'Market and customer research', 'Business model development', 'AI branding and marketing', 'Prototype planning'],
    price: 'Custom',
    tag: 'Startup'
  },
  {
    name: 'Generative AI & Productivity',
    duration: '1–2 Days',
    audience: 'Professionals & students',
    description: 'Build practical productivity habits using LLMs, automation tools, and presentation workflows.',
    topics: ['LLMs and popular assistants', 'Prompt engineering', 'AI-powered research', 'Documents and presentations', 'Productivity automation'],
    price: 'Custom',
    tag: 'Productivity'
  },
  {
    name: 'AI, Generative AI & Agentic AI',
    duration: '3 Days',
    audience: 'Advanced learners & technical teams',
    description: 'Move from AI concepts to practical prototypes with agents, RAG and workflow orchestration.',
    topics: ['AI fundamentals and LLMs', 'Prompt engineering', 'RAG-based applications', 'LLM-powered assistants', 'Agentic AI workflows', 'Practical prototypes'],
    price: '₹1,199',
    tag: 'Advanced'
  },
  {
    name: 'AI for Careers & Industry Readiness',
    duration: '1–3 Days',
    audience: 'Career switchers & final-year students',
    description: 'Develop career tools, interview readiness, and industry-facing AI fluency for job readiness.',
    topics: ['AI use across industries', 'Job search and resume support', 'LinkedIn optimization', 'Productivity tools', 'Career opportunities'],
    price: 'Custom',
    tag: 'Career'
  },
  {
    name: 'AI Industry Readiness Programme',
    duration: 'Customized / 30 Hours',
    audience: 'Campus groups & external cohorts',
    description: 'A hands-on, project-focused training path aligned to real workplace AI workflows.',
    topics: ['AI fundamentals and Generative AI', 'LLM applications', 'RAG systems', 'Workflow automation and agents', 'Practical project development'],
    price: 'Custom',
    tag: 'Corporate'
  }
];

const events = [];

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function renderWorkshops() {
  const grid = document.getElementById('workshop-grid');
  if (!grid) return;

  grid.innerHTML = workshops.map((item) => `
    <article class="workshop-card" data-workshop-filter="${item.tag}">
      <span class="tag">${item.tag}</span>
      <h3>${item.name}</h3>
      <div class="meta-list">
        <span class="meta-pill">${item.duration}</span>
        <span class="meta-pill">${item.audience}</span>
      </div>
      <p>${item.description}</p>
      <ul>
        ${item.topics.map((topic) => `<li>${topic}</li>`).join('')}
      </ul>
      <div class="price">${item.price}<small>${item.price === '₹1,199' ? ' / student' : ' / programme'}</small></div>
      <a class="btn btn-primary" href="/register.html" style="margin-top:1rem;">Register now</a>
    </article>
  `).join('');
}

function renderEvents() {
  const grid = document.getElementById('event-grid');
  if (!grid) return;

  if (!events.length) {
    grid.innerHTML = `
      <div class="event-empty">
        <h3>New events are being planned</h3>
        <p>There are no confirmed public events to list right now. Contact our team to discuss an upcoming campus programme.</p>
        <a class="btn btn-primary" href="institutions.html">Plan a campus workshop</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = events.map((event) => `
    <article class="event-card" data-event-filter="${event.status}">
      <span class="status ${event.status}">${event.statusText}</span>
      <h3>${event.title}</h3>
      <p>${event.institution}</p>
      <div class="event-meta">
        <div class="mini-card">
          <strong>${event.city}</strong>
          <small>Location</small>
        </div>
        <div class="mini-card">
          <strong>${event.date}</strong>
          <small>Date</small>
        </div>
        <div class="mini-card">
          <strong>${event.duration}</strong>
          <small>Duration</small>
        </div>
        <div class="mini-card">
          <strong>${event.registration}</strong>
          <small>Availability</small>
        </div>
      </div>
      <div class="meta-list">
        <span class="meta-pill">Venue: ${event.venue}</span>
      </div>
    </article>
  `).join('');
}

function setCurrentYear() {
  const yearNodes = document.querySelectorAll('[data-current-year]');
  yearNodes.forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
}

function bindMobileNav() {
  const toggleButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  if (!toggleButton || !nav) return;

  toggleButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggleButton.setAttribute('aria-expanded', 'false');
    });
  });
}

function bindSubmission(formId, endpoint, payloadType, successMessage, onSuccess) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
      const fields = Object.fromEntries(new FormData(form));
      if (payloadType) fields.type = payloadType;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Submission failed. Please try again.');
      }

      form.reset();
      if (onSuccess) onSuccess(result);
      showToast(successMessage(result));
    } catch (error) {
      showToast(error.message || 'Submission failed. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
}

function bindForms() {
  bindSubmission(
    'student-registration-form',
    '/api/registrations',
    null,
    (result) => `Registration received: ${result.registrationId}. Payment is pending; our team will contact you.`,
    (result) => {
      const statusNode = document.getElementById('payment-status');
      if (statusNode) {
        statusNode.textContent = `Registration ID: ${result.registrationId} • Payment pending`;
      }
    }
  );
  bindSubmission(
    'institution-form',
    '/api/enquiries',
    'institution',
    () => 'Institutional enquiry saved. Our team will contact you.'
  );
  bindSubmission(
    'partnership-form',
    '/api/enquiries',
    'partnership',
    () => 'Partnership enquiry saved. Our team will contact you.'
  );
  bindSubmission(
    'contact-form',
    '/api/enquiries',
    'contact',
    () => 'Your enquiry has been received and saved. Our team will contact you soon.'
  );
}

function bindFilters() {
  const chips = document.querySelectorAll('.filter-chip');
  const workshopCards = document.querySelectorAll('[data-workshop-filter]');
  const eventCards = document.querySelectorAll('[data-event-filter]');

  if (!chips.length) return;

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const selected = chip.dataset.filter;
      chips.forEach((item) => item.classList.toggle('active', item === chip));

      if (workshopCards.length) {
        workshopCards.forEach((card) => {
          const matches = selected === 'all' || card.dataset.workshopFilter === selected;
          card.style.display = matches ? 'block' : 'none';
        });
      }

      if (eventCards.length) {
        eventCards.forEach((card) => {
          const matches = selected === 'all' || card.dataset.eventFilter === selected;
          card.style.display = matches ? 'block' : 'none';
        });
      }
    });
  });
}

function initPage() {
  renderWorkshops();
  renderEvents();
  bindMobileNav();
  bindForms();
  bindFilters();
  setCurrentYear();
}

document.addEventListener('DOMContentLoaded', initPage);

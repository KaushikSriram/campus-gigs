const { v4: uuidv4 } = require('uuid');

function generateId() {
  return uuidv4();
}

function isEduEmail(email) {
  return email && email.toLowerCase().endsWith('.edu');
}

function getUniversityFromEmail(email) {
  const domain = email.split('@')[1];
  // Map common domains to university names
  const universityMap = {
    'gatech.edu': 'Georgia Tech',
    'mit.edu': 'MIT',
    'stanford.edu': 'Stanford University',
    'harvard.edu': 'Harvard University',
    'berkeley.edu': 'UC Berkeley',
    'umich.edu': 'University of Michigan',
    'ucla.edu': 'UCLA',
    'unc.edu': 'UNC Chapel Hill',
    'utexas.edu': 'UT Austin',
    'cornell.edu': 'Cornell University',
    'columbia.edu': 'Columbia University',
    'ufl.edu': 'University of Florida',
    'purdue.edu': 'Purdue University',
    'usc.edu': 'USC',
    'nyu.edu': 'NYU',
    'bu.edu': 'Boston University',
    'wisc.edu': 'UW-Madison',
    'illinois.edu': 'UIUC',
    'asu.edu': 'Arizona State University',
    'osu.edu': 'Ohio State University',
  };

  if (universityMap[domain]) return universityMap[domain];

  // Generate a name from the domain
  const name = domain.replace('.edu', '').replace(/\./g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const CATEGORIES = [
  'Moving & Heavy Lifting',
  'Delivery & Pickup',
  'Academic Help',
  'Tech Help',
  'Errands',
  'Cleaning & Organization',
  'Assembly & Setup',
  'Event Help',
  'Creative & Design',
  'Other',
];

const PROHIBITED_KEYWORDS = [
  'take my exam',
  'write my essay',
  'do my homework',
  'cheat',
  'drugs',
  'fake id',
  'illegal',
];

function moderateContent(text) {
  const lower = text.toLowerCase();
  for (const keyword of PROHIBITED_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { ok: false, reason: `Content contains prohibited term: "${keyword}"` };
    }
  }
  return { ok: true };
}

function sanitize(str) {
  if (!str) return str;
  return str.replace(/[<>]/g, '');
}

module.exports = {
  generateId,
  isEduEmail,
  getUniversityFromEmail,
  CATEGORIES,
  moderateContent,
  sanitize,
};

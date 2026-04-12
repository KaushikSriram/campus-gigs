require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const FORCE = process.argv.includes('--force');
const TARGET_OPEN_TASKS = 100;
const TARGET_PENDING_INTERESTS = 60;
const DEMO_UNIVERSITY = 'Georgia Tech';

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function futureDate(daysOut, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + daysOut);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19);
}

function pastDate(daysAgo, hour = 14) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19);
}

const USERS = [
  { email: 'jake@gatech.edu', name: 'Jake S.', bio: 'Junior, Mechanical Engineering. Got a truck if you need stuff moved.', payment: '@jakes-venmo' },
  { email: 'sarah@gatech.edu', name: 'Sarah M.', bio: 'Sophomore, CS major. Quick with tech problems.', payment: '@sarahm-cash' },
  { email: 'mike@gatech.edu', name: 'Mike R.', bio: 'Senior, Business. Always looking for quick gigs between classes.', payment: '@mike-zelle' },
  { email: 'emma@gatech.edu', name: 'Emma L.', bio: 'Freshman, English major. Great at proofreading and editing.', payment: '@emmal-venmo' },
  { email: 'alex@gatech.edu', name: 'Alex K.', bio: 'Junior, Industrial Design. Creative work is my thing.', payment: '@alexk-cash' },
  { email: 'priya@gatech.edu', name: 'Priya D.', bio: 'Sophomore, Biomedical Engineering. Love organizing events.', payment: '@priyad-venmo' },
  { email: 'carlos@gatech.edu', name: 'Carlos G.', bio: 'Junior, Architecture. Handy with tools and design.', payment: '@carlosg-zelle' },
  { email: 'nina@gatech.edu', name: 'Nina W.', bio: 'Senior, Psychology. Reliable and detail-oriented.', payment: '@ninaw-cash' },
  { email: 'tyler@gatech.edu', name: 'Tyler B.', bio: 'Freshman, Aerospace Engineering. Need money for ramen.', payment: '@tylerb-venmo' },
  { email: 'jordan@gatech.edu', name: 'Jordan P.', bio: 'Sophomore, CompE. Will fix your computer for pizza.', payment: '@jordanp-zelle' },
  { email: 'olivia@gatech.edu', name: 'Olivia H.', bio: 'Junior, Industrial Engineering. Great at planning and logistics.', payment: '@oliviah-venmo' },
  { email: 'deshawn@gatech.edu', name: 'DeShawn T.', bio: 'Senior, Electrical Engineering. Strong and always on time.', payment: '@deshawnt-cash' },
  { email: 'mia@gatech.edu', name: 'Mia C.', bio: 'Freshman, Biology. Love helping out around campus.', payment: '@miac-venmo' },
  { email: 'ethan@gatech.edu', name: 'Ethan F.', bio: 'Sophomore, Physics. Hiker, climber, all-around outdoors guy.', payment: '@ethanf-zelle' },
  { email: 'grace@gatech.edu', name: 'Grace N.', bio: 'Junior, Literature and Media. Photography and graphic design.', payment: '@gracen-cash' },
];

const LOCATIONS = [
  'North Ave Apartments', 'West Village', 'Glenn Dorm', 'Towers Dorm', 'Woodruff Dorm',
  'Clough Commons', 'Student Center', 'CULC', 'Klaus Building', 'Tech Green',
  'Bobby Dodd Stadium', 'CRC', 'Midtown Atlanta', 'Atlantic Station',
  'Brittain Dining Hall', 'Howey Physics', 'Van Leer', 'Remote / Online',
  'East Campus', 'Tech Square', 'Scheller College', 'Library',
];

const DURATIONS = ['15 min', '20 min', '30 min', '45 min', '1 hour', '1-2 hours', '2-3 hours', '3-4 hours'];

const CATEGORY_DEFS = [
  {
    name: 'Moving & Heavy Lifting',
    fee: [15, 60],
    helpers: [1, 2],
    items: ['couch', 'desk', 'mini fridge', 'bookshelf', 'mattress', 'boxes', 'TV stand', 'dresser', 'chair set', 'bed frame', 'storage bins', 'weight bench'],
    verbs: ['move', 'carry', 'haul', 'lift', 'load', 'unload'],
    contexts: ['to my apartment', 'into storage', 'downstairs', 'across campus', 'to the curb', 'from the parking lot'],
    locations: ['North Ave Apartments', 'Glenn Dorm', 'West Village', 'Towers Dorm', 'Midtown Atlanta'],
  },
  {
    name: 'Delivery & Pickup',
    fee: [5, 25],
    helpers: [1, 1],
    items: ['package', 'prescription', 'lunch', 'groceries', 'birthday cake', 'textbook', 'charger', 'dry cleaning', 'coffee order', 'return package', 'care package', 'mailroom pickup'],
    verbs: ['pick up', 'grab', 'drop off', 'deliver', 'bring', 'return'],
    contexts: ['to my dorm', 'to the library', 'to my apartment', 'before class ends', 'this afternoon', 'before 5 PM'],
    locations: ['Student Center', 'Brittain Dining Hall', 'UPS Store', 'Whole Foods', 'Tech Square'],
  },
  {
    name: 'Academic Help',
    fee: [10, 50],
    helpers: [1, 1],
    items: ['calculus homework', 'organic chemistry review', 'essay proofreading', 'Python project', 'physics exam prep', 'presentation slides', 'personal statement', 'Spanish translation', 'study guide', 'mock interview notes', 'linear algebra worksheet', 'CS 1331 notes'],
    verbs: ['help with', 'tutor me on', 'review', 'edit', 'coach me through', 'walk me through'],
    contexts: ['before my midterm', 'for tomorrow', 'this weekend', 'for a class project', 'during study hall', 'before office hours'],
    locations: ['CULC', 'Library', 'Clough Commons', 'Remote / Online', 'Scheller College'],
  },
  {
    name: 'Tech Help',
    fee: [10, 45],
    helpers: [1, 1],
    items: ['slow laptop', 'dual monitor setup', 'printer issue', 'Raspberry Pi server', 'data transfer', 'Arduino project', 'VPN setup', 'portfolio website', 'external hard drive', 'screen protector', 'Excel formulas', 'WiFi issue'],
    verbs: ['fix', 'set up', 'debug', 'configure', 'recover', 'troubleshoot'],
    contexts: ['before tonight', 'for a class demo', 'this afternoon', 'as soon as possible', 'before my deadline', 'so I can finish homework'],
    locations: ['Klaus Building', 'Library', 'Tech Square', 'Clough Commons', 'Remote / Online'],
  },
  {
    name: 'Errands',
    fee: [5, 30],
    helpers: [1, 1],
    items: ['library books', 'rent check', 'DMV line spot', 'laundry pickup', 'career fair swag', 'plant watering', 'lightbulb run', 'registrar letter', 'football tickets', 'post office drop-off', 'meal swipe run', 'mailing task'],
    verbs: ['handle', 'drop off', 'pick up', 'stand in line for', 'take care of', 'swing by for'],
    contexts: ['while I am in class', 'before the office closes', 'today', 'this evening', 'this weekend', 'before tomorrow'],
    locations: ['Registrar Office', 'Library', 'DMV', 'Post Office', 'Bobby Dodd Stadium'],
  },
  {
    name: 'Cleaning & Organization',
    fee: [12, 55],
    helpers: [1, 2],
    items: ['apartment cleanup', 'closet reorg', 'bathroom scrub', 'car interior', 'desk cable mess', 'kitchen cabinets', 'storage room', 'laundry help', 'move-out clean', 'garage boxes', 'study area cleanup', 'club office'],
    verbs: ['clean', 'deep clean', 'organize', 'sort', 'reset', 'declutter'],
    contexts: ['before move-out', 'after a party', 'this weekend', 'before guests arrive', 'before inspection', 'so I can focus on exams'],
    locations: ['North Ave Apartments', 'West Village', 'Student Center', 'Midtown Atlanta', 'Tech Square'],
  },
  {
    name: 'Assembly & Setup',
    fee: [10, 35],
    helpers: [1, 1],
    items: ['IKEA desk', 'bookshelf', 'TV mount', 'bed frame', 'floating shelves', 'standing desk converter', 'projector setup', 'office chair', 'curtain rods', 'garden bed', 'lamp setup', 'monitor arm'],
    verbs: ['assemble', 'mount', 'install', 'set up', 'build', 'put together'],
    contexts: ['in my dorm', 'in my apartment', 'for movie night', 'before tomorrow', 'this afternoon', 'this weekend'],
    locations: ['Glenn Dorm', 'Towers Dorm', 'North Ave Apartments', 'West Village', 'Student Center'],
  },
  {
    name: 'Event Help',
    fee: [10, 40],
    helpers: [1, 2],
    items: ['birthday party setup', 'tailgate help', '5K registration desk', 'banquet photos', 'cultural festival serving', 'a cappella ushering', 'bake sale setup', 'improv show backstage', 'DJ load-in', 'proposal setup', 'club mixer prep', 'meeting room reset'],
    verbs: ['help with', 'set up', 'run', 'photograph', 'manage', 'staff'],
    contexts: ['before the event starts', 'during the event', 'for tonight', 'this Saturday', 'before kickoff', 'for our club meeting'],
    locations: ['Student Center', 'Tech Green', 'Bobby Dodd Stadium', 'Clough Commons', 'CRC'],
  },
  {
    name: 'Creative & Design',
    fee: [10, 50],
    helpers: [1, 1],
    items: ['event poster', 'LinkedIn headshots', 'mural wall', 'startup logo', 'YouTube video edit', 'pet sketch', 'social graphics', 'birthday card', 'resume refresh', 'club banner', 'Figma mockup', 'photo retouching'],
    verbs: ['design', 'create', 'shoot', 'edit', 'draw', 'make'],
    contexts: ['for this week', 'before our launch', 'for an application', 'for a birthday surprise', 'for social media', 'by this weekend'],
    locations: ['Tech Green', 'Student Center', 'Clough Commons', 'Remote / Online', 'Midtown Atlanta'],
  },
  {
    name: 'Other',
    fee: [8, 30],
    helpers: [1, 1],
    items: ['guitar lessons', 'workout accountability', 'dog walking', 'cooking basics', 'mock interview', 'jacket repair', 'bike lessons', 'lease review', 'meal prep coaching', 'roommate mediation prep', 'calendar planning', 'airport ride'],
    verbs: ['teach me', 'help me with', 'coach me through', 'walk', 'review', 'practice'],
    contexts: ['this week', 'before finals', 'after class', 'this weekend', 'before my interview', 'as soon as possible'],
    locations: ['CRC', 'Tech Green', 'North Ave Apartments', 'Library', 'Remote / Online'],
  },
];

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildDescription(item, categoryName, context, location) {
  return `Need help with ${item} for ${categoryName.toLowerCase()}. Prefer someone reliable who can handle it ${context}. Meet at ${location}.`;
}

function buildGeneratedTemplates() {
  const templates = [];

  for (const category of CATEGORY_DEFS) {
    for (let i = 0; i < category.items.length; i += 1) {
      const item = category.items[i];
      const verb = category.verbs[i % category.verbs.length];
      const context = category.contexts[i % category.contexts.length];
      const location = category.locations[i % category.locations.length];

      templates.push({
        title: `${titleCase(verb)} my ${item}`,
        category: category.name,
        description: buildDescription(item, category.name, context, location),
        pay: category.fee,
        helpers: category.helpers[i % category.helpers.length],
      });
    }
  }

  return templates;
}

const TASK_TEMPLATES = buildGeneratedTemplates();

const COMPLETED_PAIRS = [
  { posterEmail: 'jake@gatech.edu', taskerEmail: 'sarah@gatech.edu', title: 'Moved 5 boxes across campus', rating1: 5, comment1: 'Super helpful and fast! Would definitely hire again.', rating2: 5, comment2: 'Great poster, clear instructions. Easy to work with.' },
  { posterEmail: 'mike@gatech.edu', taskerEmail: 'emma@gatech.edu', title: 'Proofread a 15-page research paper', rating1: 4, comment1: 'Did a good job catching typos. Could improve feedback on structure.', rating2: 5, comment2: 'Very polite, paid on time.' },
  { posterEmail: 'alex@gatech.edu', taskerEmail: 'jake@gatech.edu', title: 'Assembled a bookshelf and desk', rating1: 5, comment1: 'Fast and knew exactly what to do. Highly recommend.', rating2: 4, comment2: 'Task was easy, good communication.' },
  { posterEmail: 'sarah@gatech.edu', taskerEmail: 'alex@gatech.edu', title: 'Delivered textbooks to library', rating1: 5, comment1: 'Quick and reliable.', rating2: 5, comment2: 'Smooth transaction.' },
  { posterEmail: 'emma@gatech.edu', taskerEmail: 'mike@gatech.edu', title: 'Set up a projector for movie night', rating1: 4, comment1: 'Got the job done, thanks!', rating2: 4, comment2: 'Fun gig, would do again.' },
];

async function wipeAllData() {
  console.log('Force flag detected - wiping existing data...');
  await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('task_applications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('email_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wiped.');
}

async function ensureDemoUsers() {
  const rows = USERS.map((user) => ({
    email: user.email,
    display_name: user.name,
    bio: user.bio,
    payment_handle: user.payment,
    university: DEMO_UNIVERSITY,
    email_verified: true,
  }));

  const { error } = await supabase.from('users').upsert(rows, { onConflict: 'email' });
  if (error) throw new Error(`Failed to upsert demo users: ${error.message}`);

  const { data, error: fetchError } = await supabase
    .from('users')
    .select('id, email, display_name')
    .in('email', USERS.map((user) => user.email));

  if (fetchError) throw new Error(`Failed to fetch demo users: ${fetchError.message}`);
  return data || [];
}

async function getOpenTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, poster_id')
    .eq('status', 'open')
    .eq('university', DEMO_UNIVERSITY);

  if (error) throw new Error(`Failed to fetch open tasks: ${error.message}`);
  return data || [];
}

function buildOpenTasks(users, existingTitles, countNeeded) {
  return shuffle(TASK_TEMPLATES)
    .filter((task) => !existingTitles.has(task.title))
    .slice(0, countNeeded)
    .map((task) => {
      const poster = pick(users);
      const isAsap = Math.random() < 0.2;

      return {
        id: uuidv4(),
        poster_id: poster.id,
        title: task.title,
        category: task.category,
        description: task.description,
        location: pick(LOCATIONS),
        date_time: isAsap ? new Date().toISOString() : futureDate(rand(1, 14), rand(7, 20)),
        date_type: isAsap ? 'asap' : 'specific',
        estimated_duration: pick(DURATIONS),
        offered_pay: rand(task.pay[0], task.pay[1]),
        helpers_needed: task.helpers,
        university: DEMO_UNIVERSITY,
        status: 'open',
        photos: '[]',
      };
    });
}

async function ensureOpenTasks(users) {
  const existingOpenTasks = await getOpenTasks();
  const countNeeded = Math.max(TARGET_OPEN_TASKS - existingOpenTasks.length, 0);

  if (countNeeded === 0) {
    return { existingOpenTasks, createdOpenTasks: [] };
  }

  const existingTitles = new Set(existingOpenTasks.map((task) => task.title));
  const rows = buildOpenTasks(users, existingTitles, countNeeded);

  const { data, error } = await supabase
    .from('tasks')
    .insert(rows)
    .select('id, title, poster_id');

  if (error) throw new Error(`Failed to create open tasks: ${error.message}`);

  return { existingOpenTasks, createdOpenTasks: data || [] };
}

async function ensurePendingInterests(users, openTasks) {
  if (openTasks.length === 0) return 0;

  const { count, error } = await supabase
    .from('task_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .in('task_id', openTasks.map((task) => task.id));

  if (error) throw new Error(`Failed to count pending interests: ${error.message}`);

  let needed = Math.max(TARGET_PENDING_INTERESTS - (count || 0), 0);
  let created = 0;
  let attempts = 0;

  while (needed > 0 && attempts < 500) {
    attempts += 1;
    const task = pick(openTasks);
    const tasker = pick(users.filter((user) => user.id !== task.poster_id));

    const { error: insertError } = await supabase.from('task_applications').insert({
      id: uuidv4(),
      task_id: task.id,
      tasker_id: tasker.id,
      status: 'pending',
    });

    if (!insertError) {
      created += 1;
      needed -= 1;
    }
  }

  return created;
}

async function ensureCompletedTasksWithReviews(users) {
  const userByEmail = new Map(users.map((user) => [user.email, user]));

  const { data: existingCompleted, error } = await supabase
    .from('tasks')
    .select('title')
    .eq('status', 'completed')
    .eq('university', DEMO_UNIVERSITY)
    .in('title', COMPLETED_PAIRS.map((pair) => pair.title));

  if (error) throw new Error(`Failed to fetch completed demo tasks: ${error.message}`);

  const existingTitles = new Set((existingCompleted || []).map((task) => task.title));
  let created = 0;

  for (const pair of COMPLETED_PAIRS) {
    if (existingTitles.has(pair.title)) continue;

    const poster = userByEmail.get(pair.posterEmail);
    const tasker = userByEmail.get(pair.taskerEmail);
    if (!poster || !tasker) continue;

    const taskId = uuidv4();
    const { error: taskError } = await supabase.from('tasks').insert({
      id: taskId,
      poster_id: poster.id,
      title: pair.title,
      category: pick(['Moving & Heavy Lifting', 'Academic Help', 'Assembly & Setup', 'Delivery & Pickup', 'Event Help']),
      description: 'Completed demo task.',
      location: pick(LOCATIONS),
      date_time: pastDate(rand(3, 30)),
      offered_pay: rand(15, 40),
      university: DEMO_UNIVERSITY,
      status: 'completed',
      assigned_tasker_id: tasker.id,
      photos: '[]',
    });

    if (taskError) continue;

    await supabase.from('task_applications').insert({
      id: uuidv4(),
      task_id: taskId,
      tasker_id: tasker.id,
      status: 'completed',
    });

    await supabase.from('reviews').insert({
      id: uuidv4(),
      task_id: taskId,
      reviewer_id: poster.id,
      reviewee_id: tasker.id,
      rating: pair.rating1,
      comment: pair.comment1,
    });

    await supabase.from('reviews').insert({
      id: uuidv4(),
      task_id: taskId,
      reviewer_id: tasker.id,
      reviewee_id: poster.id,
      rating: pair.rating2,
      comment: pair.comment2,
    });

    created += 1;
  }

  return created;
}

async function seed() {
  if (FORCE) {
    await wipeAllData();
  }

  console.log('Seeding database...');

  const users = await ensureDemoUsers();
  console.log(`  ok ${users.length} demo users ready`);

  const { existingOpenTasks, createdOpenTasks } = await ensureOpenTasks(users);
  const openTasks = [...existingOpenTasks, ...createdOpenTasks];
  console.log(`  ok ${createdOpenTasks.length} open tasks created`);
  console.log(`  ok ${openTasks.length} open Georgia Tech tasks available`);

  const interestsCreated = await ensurePendingInterests(users, openTasks);
  console.log(`  ok ${interestsCreated} pending interests created`);

  const completedCreated = await ensureCompletedTasksWithReviews(users);
  console.log(`  ok ${completedCreated} completed tasks created`);

  console.log(`\nDone! The database now targets ${TARGET_OPEN_TASKS} open demo posts.`);
  console.log('\nTest accounts (passwordless OTP):');
  for (const user of USERS) {
    console.log(`  ${user.name.padEnd(14)} ${user.email}`);
  }
}

seed().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

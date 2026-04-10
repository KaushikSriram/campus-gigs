const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const DEMO_UNIVERSITY = 'Georgia Institute of Technology';
const DEMO_PASSWORD = 'password123';
const TARGET_OPEN_TASKS = 100;

const NAMES = [
  'Alex Chen',
  'Jordan Rivera',
  'Sam Patel',
  'Taylor Kim',
  'Morgan Lee',
  'Casey Brooks',
  'Riley Johnson',
  'Avery Thomas',
  'Quinn Martinez',
  'Drew Wilson',
  'Jamie Foster',
  'Skyler Adams',
  'Peyton Clark',
  'Hayden Wright',
  'Reese Campbell',
  'Cameron Hall',
  'Dakota Price',
  'Finley Ross',
  'Sage Mitchell',
  'Rowan Cooper',
];

const CATEGORIES = ['moving', 'tutoring', 'errands', 'tech_help', 'cleaning', 'delivery', 'other'];

const TASK_TEMPLATES = [
  {
    cat: 'moving',
    titles: [
      'Help me move a couch to my new apartment',
      'Need help carrying boxes upstairs',
      'Moving out and need help loading a U-Haul',
      'Help rearrange furniture in my dorm room',
      'Need someone to move a desk across campus',
      'Moving a mini-fridge from storage to my room',
      'Help carry a mattress to my new place',
      'Need two people to help with an apartment move',
      'Moving a bookshelf that is too heavy for one person',
      'Help me bring furniture up from the parking lot',
      'Carry a TV stand from my car to my apartment',
      'Need help loading boxes into my car',
      'Moving day help for heavy stuff',
      'Help move a washer and dryer combo downstairs',
      'Need someone to help disassemble and move a bed frame',
    ],
    fee: [15, 50],
  },
  {
    cat: 'tutoring',
    titles: [
      'Need a tutor for Calculus II before my midterm',
      'Help with organic chemistry homework',
      'Python programming tutor needed for intro CS',
      'Looking for a writing tutor for English comp',
      'Stats tutoring for probability',
      'Physics II tutor needed this week',
      'Help me study for my biology final',
      'Need help understanding linear algebra',
      'Looking for a Spanish conversation partner',
      'Data structures study buddy needed',
      'Economics tutor for supply and demand',
      'Help me prep for the GRE math section',
      'Accounting tutor needed for a midterm',
      'Need help with a research paper outline',
      'Discrete math tutor needed for proofs',
    ],
    fee: [20, 45],
  },
  {
    cat: 'errands',
    titles: [
      'Pick up my dry cleaning on Peachtree Street',
      'Need someone to grab groceries from Kroger',
      'Return a package at the UPS Store for me',
      'Pick up a prescription from CVS',
      'Drop off library books before closing',
      'Need someone to wait for my Amazon delivery',
      'Grab me lunch from the dining hall',
      'Return some clothes at the mall for me',
      'Pick up my laundry from the laundromat',
      'Need someone to mail a package at USPS',
      'Get me coffee and snacks from the student center',
      'Pick up a cake from the bakery for a birthday',
      'Drop off my car at the mechanic',
      'Need someone to stand in line at the registrar',
      'Grab textbooks from the campus bookstore',
    ],
    fee: [8, 25],
  },
  {
    cat: 'tech_help',
    titles: [
      'Fix my laptop because it will not connect to WiFi',
      'Help me set up dual monitors on my desk',
      'Need help formatting a Word document',
      'Set up my new printer with my laptop',
      'Help me recover files from a crashed hard drive',
      'Install Windows on my new PC build',
      'Fix my phone screen and I already have the parts',
      'Help me build a simple website for a class project',
      'Set up a VPN on my devices',
      'Need help with Excel formulas for a project',
      'Transfer data from my old phone to my new phone',
      'Help me set up a Raspberry Pi',
      'Fix my desktop because it keeps blue-screening',
      'Help me edit a video for my class presentation',
      'Set up my smart home devices',
    ],
    fee: [15, 40],
  },
  {
    cat: 'cleaning',
    titles: [
      'Deep clean my apartment before move-out inspection',
      'Clean my dorm room while I am at class',
      'Need help organizing my closet',
      'Kitchen deep clean needed',
      'Bathroom scrub before my parents visit',
      'Help me declutter and organize my room',
      'Clean my car interior',
      'Post-party apartment cleanup needed',
      'Need help cleaning out my storage unit',
      'Window cleaning for my apartment',
      'Organize and clean my home office setup',
      'Deep clean the oven and stovetop',
      'Help me organize my study space',
      'Clean and organize a shared living room',
      'Spring cleaning help for the whole apartment',
    ],
    fee: [20, 60],
  },
  {
    cat: 'delivery',
    titles: [
      'Deliver my notes to a classmate across campus',
      'Pick up food and bring it to the library',
      'Need someone to deliver a birthday gift to my friend',
      'Bring my charger from my dorm to the study room',
      'Deliver a textbook to someone who bought it from me',
      'Pick up takeout while I am studying',
      'Bring me my backpack because I left it in the dining hall',
      'Deliver flyers to buildings around campus',
      'Bring snacks to our study group in the library',
      'Pick up and deliver a poster from FedEx Office',
      'Need someone to bring my gym bag to the rec center',
      'Deliver cupcakes to the student org meeting room',
      'Pick up a package from the mailroom for me',
      'Bring me my laptop from my apartment to the lab',
      'Deliver a care package to my friend in the dorms',
    ],
    fee: [5, 18],
  },
  {
    cat: 'other',
    titles: [
      'Take professional photos of me for LinkedIn',
      'Help me practice for a mock interview',
      'Walk my dog while I am in class',
      'Need someone to water my plants for a week',
      'Help me hang shelves and pictures in my apartment',
      'Proofread my resume and cover letter',
      'Help me assemble IKEA furniture',
      'Need a ride to the airport on Friday morning',
      'Take notes for me in Bio 101 because I am sick',
      'Help me film a social video',
      'Feed my cat while I am away this weekend',
      'Teach me how to cook three simple meals',
      'Help me paint my room',
      'Sew a button back on my jacket',
      'Help me plan and set up for a surprise party',
    ],
    fee: [10, 35],
  },
];

const DESCRIPTIONS = [
  'Pretty straightforward and should not take more than an hour.',
  'I am flexible on timing, and anytime this week works for me.',
  'Need this done as soon as possible, ideally today or tomorrow.',
  'Happy to pay a little more if you can come within the next few hours.',
  'This is pretty easy, I just need an extra pair of hands.',
  'I have everything needed, just need your time and effort.',
  'Located near the main campus area. Message me if you are interested.',
  'First time posting here and hoping someone can help out.',
  'I can provide snacks and drinks as a bonus.',
  'Can negotiate the price if needed.',
  'Should take about 30 to 45 minutes.',
  'I will be around all day so come whenever works for you.',
  'Would really appreciate the help.',
  'Perfect if you want to make some quick cash.',
  'I live right by the student center so it is easy to get to.',
];

const LOCATIONS = [
  'North Campus',
  'South Campus',
  'West Campus',
  'East Campus',
  'Student Center',
  'Main Library',
  'Engineering Building',
  'Science Complex',
  'Dining Hall',
  'Recreation Center',
  'Dormitory Row',
  'Off-campus apartments',
  'Greek Row',
  'Business School',
  'Arts Building',
  'Near the stadium',
  '',
  '',
  '',
  '',
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack, daysForward) {
  const now = Date.now();
  const start = now - daysBack * 86400000;
  const end = now + daysForward * 86400000;
  return new Date(start + Math.random() * (end - start));
}

function futureDateStr(minDays, maxDays) {
  const date = new Date();
  date.setDate(date.getDate() + rand(minDays, maxDays));
  return date.toISOString().split('T')[0];
}

function buildDemoUsers() {
  const password = bcrypt.hashSync(DEMO_PASSWORD, 10);

  return NAMES.map((name, index) => ({
    email: `${name.toLowerCase().replace(/\s/g, '.')}@gatech.edu`,
    password,
    name,
    university: DEMO_UNIVERSITY,
    bio: [
      'Just a student trying to make some extra cash.',
      'Happy to help with anything on campus.',
      'Junior studying CS and always looking for side gigs.',
      'Senior year and trying to save up before graduation.',
      'Love helping people out.',
      'New to campus and looking to meet people and earn money.',
      'Engineering major with too much free time.',
      'Pre-med student who needs study breaks.',
      'Business major who likes quick side jobs.',
      'Music major who is surprisingly handy.',
    ][index % 10],
    rating: [0, 0, 3.5, 4.0, 4.2, 4.5, 4.7, 4.8, 4.9, 5.0][index % 10],
    total_reviews: [0, 0, 2, 3, 5, 8, 12, 6, 15, 4][index % 10],
  }));
}

async function ensureDemoUsers() {
  const users = buildDemoUsers();
  const { data, error } = await supabase
    .from('users')
    .upsert(users, { onConflict: 'email' })
    .select('id, name, email');

  if (error) {
    throw new Error(`Failed to create demo users: ${error.message}`);
  }

  return data || [];
}

async function countExistingOpenTasks(userIds) {
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .in('poster_id', userIds)
    .eq('status', 'open');

  if (error) {
    throw new Error(`Failed to count existing demo tasks: ${error.message}`);
  }

  return count || 0;
}

function buildTasks(users, countNeeded) {
  const tasks = [];

  for (let index = 0; index < countNeeded; index += 1) {
    const template = pick(TASK_TEMPLATES);
    const poster = pick(users);
    const createdAt = randomDate(14, 0).toISOString();

    tasks.push({
      poster_id: poster.id,
      title: pick(template.titles),
      description: pick(DESCRIPTIONS),
      category: template.cat,
      fee: rand(template.fee[0], template.fee[1]),
      location: pick(LOCATIONS),
      due_date: Math.random() > 0.35 ? futureDateStr(1, 21) : null,
      status: 'open',
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  return tasks;
}

async function insertTasks(tasks) {
  if (tasks.length === 0) {
    return 0;
  }

  const { data, error } = await supabase.from('tasks').insert(tasks).select('id');

  if (error) {
    throw new Error(`Failed to create demo tasks: ${error.message}`);
  }

  return (data || []).length;
}

async function seed() {
  console.log('Seeding shared demo data...');

  const demoUsers = await ensureDemoUsers();
  const demoUserIds = demoUsers.map((user) => user.id);
  const existingOpenTasks = await countExistingOpenTasks(demoUserIds);
  const tasksToCreate = Math.max(TARGET_OPEN_TASKS - existingOpenTasks, 0);

  console.log(`Demo users ready: ${demoUsers.length}`);
  console.log(`Existing open demo tasks: ${existingOpenTasks}`);

  if (tasksToCreate === 0) {
    console.log(`Target already met. No new tasks were added.`);
  } else {
    const createdCount = await insertTasks(buildTasks(demoUsers, tasksToCreate));
    console.log(`Created ${createdCount} additional open demo tasks.`);
  }

  const finalOpenTasks = await countExistingOpenTasks(demoUserIds);
  console.log(`Open demo tasks now available: ${finalOpenTasks}`);
  console.log(`Demo login: alex.chen@gatech.edu / ${DEMO_PASSWORD}`);
}

seed().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

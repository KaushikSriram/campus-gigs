require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb, run, get } = require('./database');
const { generateId } = require('./utils/helpers');

async function seed() {
  await getDb();

  // Check if already seeded
  const existing = get('SELECT id FROM users LIMIT 1');
  if (existing) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding database...');

  const hash = await bcrypt.hash('password123', 10);

  // Create users
  const users = [
    { id: generateId(), email: 'jake@gatech.edu', name: 'Jake S.', bio: 'Junior, Mechanical Engineering. Got a truck if you need stuff moved.', payment: '@jakes-venmo' },
    { id: generateId(), email: 'sarah@gatech.edu', name: 'Sarah M.', bio: 'Sophomore, CS major. Quick with tech problems.', payment: '@sarahm-cash' },
    { id: generateId(), email: 'mike@gatech.edu', name: 'Mike R.', bio: 'Senior, Business. Always looking for quick gigs between classes.', payment: '@mike-zelle' },
    { id: generateId(), email: 'emma@gatech.edu', name: 'Emma L.', bio: 'Freshman, English major. Great at proofreading and editing.', payment: '@emmal-venmo' },
    { id: generateId(), email: 'alex@gatech.edu', name: 'Alex K.', bio: 'Junior, Industrial Design. Creative work is my thing.', payment: '@alexk-cash' },
  ];

  for (const u of users) {
    run(
      `INSERT INTO users (id, email, password_hash, display_name, bio, payment_handle, university, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [u.id, u.email, hash, u.name, u.bio, u.payment, 'Georgia Tech']
    );
  }

  // Create tasks
  const tasks = [
    {
      id: generateId(), posterId: users[0].id, title: 'Help me move a couch from 3rd floor to 1st floor',
      category: 'Moving & Heavy Lifting', description: 'I have a medium-sized couch that needs to go from my 3rd floor apartment down to the 1st floor lobby. Elevator is broken so we have to take the stairs. Should take about 30 min. Need someone strong!',
      location: 'North Ave Apartments', dateTime: '2026-04-09T15:00:00', duration: '30 min', pay: 25, helpers: 1,
    },
    {
      id: generateId(), posterId: users[1].id, title: 'Pick up my package from the mail center',
      category: 'Delivery & Pickup', description: 'I have a package at the campus mail center but I\'m stuck in lab all day. Need someone to grab it and bring it to my dorm room. It\'s a small box, nothing heavy.',
      location: 'Campus Mail Center → Towers Dorm', dateTime: '2026-04-08T16:00:00', duration: '20 min', pay: 10, helpers: 1,
    },
    {
      id: generateId(), posterId: users[2].id, title: 'Need someone to proofread my 10-page essay',
      category: 'Academic Help', description: 'I have a 10-page research paper on supply chain management due tomorrow. Need someone with good writing skills to proofread for grammar, clarity, and flow. APA format.',
      location: 'Can be done remotely', dateTime: '2026-04-08T20:00:00', duration: '1-2 hours', pay: 30, helpers: 1,
    },
    {
      id: generateId(), posterId: users[3].id, title: 'Assemble IKEA desk in my dorm',
      category: 'Assembly & Setup', description: 'Just got a KALLAX shelf and a MALM desk from IKEA. I have the tools but need an extra pair of hands. Instructions included.',
      location: 'Woodruff Dorm, Room 412', dateTime: '2026-04-10T11:00:00', duration: '1-2 hours', pay: 35, helpers: 1,
    },
    {
      id: generateId(), posterId: users[0].id, title: 'Grab me lunch from Brittain Dining Hall',
      category: 'Delivery & Pickup', description: 'I\'m sick and can\'t leave my room. Can someone grab me a meal from Brittain? I\'ll tell you exactly what to get. I\'ll pay for the food separately + the delivery fee.',
      location: 'Brittain Dining Hall → North Ave Apts', dateTime: '2026-04-08T12:00:00', duration: '30 min', pay: 12, helpers: 1,
    },
    {
      id: generateId(), posterId: users[4].id, title: 'Need 2 people to help move into new apartment',
      category: 'Moving & Heavy Lifting', description: 'Moving from dorm to off-campus apartment. Have about 10 boxes, a bed frame, desk, and some other furniture. I have a U-Haul truck rented. Need two strong helpers.',
      location: 'Glenn Dorm → Midtown Atlanta', dateTime: '2026-04-12T09:00:00', duration: '3-4 hours', pay: 50, helpers: 2,
    },
    {
      id: generateId(), posterId: users[1].id, title: 'Design a poster for our club event',
      category: 'Creative & Design', description: 'Robotics club has a demo day coming up. Need a clean, eye-catching poster (11x17) with event details. I\'ll provide the text and logo. Need someone with graphic design skills.',
      location: 'Remote / meet at Student Center', dateTime: '2026-04-11T14:00:00', duration: '2-3 hours', pay: 40, helpers: 1,
    },
    {
      id: generateId(), posterId: users[2].id, title: 'Wait in line for football tickets',
      category: 'Errands', description: 'Student ticket window opens at 8 AM. I have a 9 AM class. Need someone to hold my spot in line and get me a ticket. I\'ll send you my student ID photo.',
      location: 'Bobby Dodd Stadium', dateTime: '2026-04-09T07:30:00', duration: '1-2 hours', pay: 20, helpers: 1,
    },
    {
      id: generateId(), posterId: users[3].id, title: 'Help set up for birthday party',
      category: 'Event Help', description: 'Setting up a surprise birthday party in the common room. Need help with balloons, streamers, table setup, and putting up a banner. I have all the supplies.',
      location: 'Harris Dorm Common Room', dateTime: '2026-04-10T16:00:00', duration: '1 hour', pay: 15, helpers: 2,
    },
    {
      id: generateId(), posterId: users[4].id, title: 'Computer running slow — need tech help',
      category: 'Tech Help', description: 'My laptop has been super slow lately. Need someone who knows computers to take a look, clean it up, maybe remove some junk software. It\'s a Windows laptop, about 2 years old.',
      location: 'Clough Commons', dateTime: '2026-04-09T13:00:00', duration: '1 hour', pay: 20, helpers: 1,
    },
  ];

  for (const t of tasks) {
    run(
      `INSERT INTO tasks (id, poster_id, title, category, description, location, date_time, estimated_duration, offered_pay, helpers_needed, university, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [t.id, t.posterId, t.title, t.category, t.description, t.location, t.dateTime, t.duration, t.pay, t.helpers, 'Georgia Tech']
    );
  }

  // Add some reviews between users for demo
  const review1 = generateId();
  const review2 = generateId();
  // Create a completed task for review context
  const completedTaskId = generateId();
  run(
    `INSERT INTO tasks (id, poster_id, title, category, description, location, date_time, offered_pay, university, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
    [completedTaskId, users[0].id, 'Past task: Moved boxes', 'Moving & Heavy Lifting', 'Moved 5 boxes', 'West Campus', '2026-03-01T10:00:00', 20, 'Georgia Tech']
  );
  run(
    `INSERT INTO task_applications (id, task_id, tasker_id, status) VALUES (?, ?, ?, 'completed')`,
    [generateId(), completedTaskId, users[1].id]
  );
  run(
    `INSERT INTO reviews (id, task_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)`,
    [review1, completedTaskId, users[0].id, users[1].id, 5, 'Super helpful and fast! Would definitely hire again.']
  );
  run(
    `INSERT INTO reviews (id, task_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)`,
    [review2, completedTaskId, users[1].id, users[0].id, 5, 'Great poster, clear instructions. Easy to work with.']
  );

  console.log(`Seeded ${users.length} users and ${tasks.length} tasks`);
  console.log('\nTest accounts (all use password: password123):');
  for (const u of users) {
    console.log(`  ${u.name} — ${u.email}`);
  }
}

seed().catch(console.error);

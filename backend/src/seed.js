require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function seed() {
  const { data: existing } = await supabase.from('users').select('id').limit(1);
  if (existing && existing.length > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding database...');

  const hash = await bcrypt.hash('password123', 10);

  const users = [
    { id: uuidv4(), email: 'jake@gatech.edu', name: 'Jake S.', bio: 'Junior, Mechanical Engineering. Got a truck if you need stuff moved.', payment: '@jakes-venmo' },
    { id: uuidv4(), email: 'sarah@gatech.edu', name: 'Sarah M.', bio: 'Sophomore, CS major. Quick with tech problems.', payment: '@sarahm-cash' },
    { id: uuidv4(), email: 'mike@gatech.edu', name: 'Mike R.', bio: 'Senior, Business. Always looking for quick gigs between classes.', payment: '@mike-zelle' },
    { id: uuidv4(), email: 'emma@gatech.edu', name: 'Emma L.', bio: 'Freshman, English major. Great at proofreading and editing.', payment: '@emmal-venmo' },
    { id: uuidv4(), email: 'alex@gatech.edu', name: 'Alex K.', bio: 'Junior, Industrial Design. Creative work is my thing.', payment: '@alexk-cash' },
  ];

  for (const u of users) {
    const { error } = await supabase.from('users').insert({
      id: u.id,
      email: u.email,
      password_hash: hash,
      display_name: u.name,
      bio: u.bio,
      payment_handle: u.payment,
      university: 'Georgia Tech',
      email_verified: true,
    });
    if (error) console.error(`Failed to insert user ${u.email}:`, error.message);
  }

  const tasks = [
    {
      id: uuidv4(), posterId: users[0].id, title: 'Help me move a couch from 3rd floor to 1st floor',
      category: 'Moving & Heavy Lifting', description: 'I have a medium-sized couch that needs to go from my 3rd floor apartment down to the 1st floor lobby. Elevator is broken so we have to take the stairs. Should take about 30 min. Need someone strong!',
      location: 'North Ave Apartments', dateTime: '2026-04-09T15:00:00', duration: '30 min', pay: 25, helpers: 1,
    },
    {
      id: uuidv4(), posterId: users[1].id, title: 'Pick up my package from the mail center',
      category: 'Delivery & Pickup', description: "I have a package at the campus mail center but I'm stuck in lab all day. Need someone to grab it and bring it to my dorm room. It's a small box, nothing heavy.",
      location: 'Campus Mail Center → Towers Dorm', dateTime: '2026-04-08T16:00:00', duration: '20 min', pay: 10, helpers: 1,
    },
    {
      id: uuidv4(), posterId: users[2].id, title: 'Need someone to proofread my 10-page essay',
      category: 'Academic Help', description: 'I have a 10-page research paper on supply chain management due tomorrow. Need someone with good writing skills to proofread for grammar, clarity, and flow. APA format.',
      location: 'Can be done remotely', dateTime: '2026-04-08T20:00:00', duration: '1-2 hours', pay: 30, helpers: 1,
    },
    {
      id: uuidv4(), posterId: users[3].id, title: 'Assemble IKEA desk in my dorm',
      category: 'Assembly & Setup', description: 'Just got a KALLAX shelf and a MALM desk from IKEA. I have the tools but need an extra pair of hands. Instructions included.',
      location: 'Woodruff Dorm, Room 412', dateTime: '2026-04-10T11:00:00', duration: '1-2 hours', pay: 35, helpers: 1,
    },
    {
      id: uuidv4(), posterId: users[0].id, title: 'Grab me lunch from Brittain Dining Hall',
      category: 'Delivery & Pickup', description: "I'm sick and can't leave my room. Can someone grab me a meal from Brittain? I'll tell you exactly what to get. I'll pay for the food separately + the delivery fee.",
      location: 'Brittain Dining Hall → North Ave Apts', dateTime: '2026-04-08T12:00:00', duration: '30 min', pay: 12, helpers: 1,
    },
    {
      id: uuidv4(), posterId: users[4].id, title: 'Need 2 people to help move into new apartment',
      category: 'Moving & Heavy Lifting', description: 'Moving from dorm to off-campus apartment. Have about 10 boxes, a bed frame, desk, and some other furniture. I have a U-Haul truck rented. Need two strong helpers.',
      location: 'Glenn Dorm → Midtown Atlanta', dateTime: '2026-04-12T09:00:00', duration: '3-4 hours', pay: 50, helpers: 2,
    },
    {
      id: uuidv4(), posterId: users[1].id, title: 'Design a poster for our club event',
      category: 'Creative & Design', description: "Robotics club has a demo day coming up. Need a clean, eye-catching poster (11x17) with event details. I'll provide the text and logo. Need someone with graphic design skills.",
      location: 'Remote / meet at Student Center', dateTime: '2026-04-11T14:00:00', duration: '2-3 hours', pay: 40, helpers: 1,
    },
    {
      id: uuidv4(), posterId: users[2].id, title: 'Wait in line for football tickets',
      category: 'Errands', description: "Student ticket window opens at 8 AM. I have a 9 AM class. Need someone to hold my spot in line and get me a ticket. I'll send you my student ID photo.",
      location: 'Bobby Dodd Stadium', dateTime: '2026-04-09T07:30:00', duration: '1-2 hours', pay: 20, helpers: 1,
    },
    {
      id: uuidv4(), posterId: users[3].id, title: 'Help set up for birthday party',
      category: 'Event Help', description: 'Setting up a surprise birthday party in the common room. Need help with balloons, streamers, table setup, and putting up a banner. I have all the supplies.',
      location: 'Harris Dorm Common Room', dateTime: '2026-04-10T16:00:00', duration: '1 hour', pay: 15, helpers: 2,
    },
    {
      id: uuidv4(), posterId: users[4].id, title: 'Computer running slow — need tech help',
      category: 'Tech Help', description: "My laptop has been super slow lately. Need someone who knows computers to take a look, clean it up, maybe remove some junk software. It's a Windows laptop, about 2 years old.",
      location: 'Clough Commons', dateTime: '2026-04-09T13:00:00', duration: '1 hour', pay: 20, helpers: 1,
    },
  ];

  for (const t of tasks) {
    const { error } = await supabase.from('tasks').insert({
      id: t.id,
      poster_id: t.posterId,
      title: t.title,
      category: t.category,
      description: t.description,
      location: t.location,
      date_time: t.dateTime,
      estimated_duration: t.duration,
      offered_pay: t.pay,
      helpers_needed: t.helpers,
      university: 'Georgia Tech',
      status: 'open',
      photos: '[]',
    });
    if (error) console.error(`Failed to insert task "${t.title}":`, error.message);
  }

  // Demo completed task with reviews
  const completedTaskId = uuidv4();
  await supabase.from('tasks').insert({
    id: completedTaskId,
    poster_id: users[0].id,
    title: 'Past task: Moved boxes',
    category: 'Moving & Heavy Lifting',
    description: 'Moved 5 boxes',
    location: 'West Campus',
    date_time: '2026-03-01T10:00:00',
    offered_pay: 20,
    university: 'Georgia Tech',
    status: 'completed',
    photos: '[]',
  });

  const appId = uuidv4();
  await supabase.from('task_applications').insert({
    id: appId,
    task_id: completedTaskId,
    tasker_id: users[1].id,
    status: 'completed',
  });

  await supabase.from('reviews').insert({
    id: uuidv4(),
    task_id: completedTaskId,
    reviewer_id: users[0].id,
    reviewee_id: users[1].id,
    rating: 5,
    comment: 'Super helpful and fast! Would definitely hire again.',
  });

  await supabase.from('reviews').insert({
    id: uuidv4(),
    task_id: completedTaskId,
    reviewer_id: users[1].id,
    reviewee_id: users[0].id,
    rating: 5,
    comment: 'Great poster, clear instructions. Easy to work with.',
  });

  console.log(`Seeded ${users.length} users and ${tasks.length} tasks`);
  console.log('\nTest accounts (all use password: password123):');
  for (const u of users) {
    console.log(`  ${u.name} — ${u.email}`);
  }
}

seed().catch(console.error);


const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// NOTE: This script assumes you have these env vars set or you replace them here
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

// We need service role key to bypass RLS if we are inserting rows that might be public
// For now we will assume the user runs this with the service role key env var or we just output the SQL.

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to slugify text
function slugify(text) {
  return text.toString().toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
}

// The Catalog from lib/exerciseCatalog.js
// I am copying it here because the original file uses ES6 export which might not work in a simple node script without module setup
const exerciseCatalog = {
  Chest: {
    Presses: [
      'Bench Press',
      'Incline Bench Press',
      'Dumbbell Bench Press',
      'Decline Bench Press',
      'Chest Press Machine',
      'Hammer Strength Chest Press',
      'Smith Machine Bench Press',
      'Cable Chest Press',
      'Landmine Press'
    ],
    Flyes: [
      'Cable Fly',
      'Dumbbell Fly',
      'Pec Deck',
      'Machine Fly',
      'Incline Dumbbell Fly',
      'Cable Crossover'
    ],
    Bodyweight: [
      'Push-up',
      'Incline Push-up',
      'Dip',
      'Weighted Dip'
    ]
  },
  Back: {
    Rows: [
      'Seated Cable Row',
      'Chest-Supported Row',
      'Dumbbell Row',
      'Barbell Row',
      'Pendlay Row',
      'T-Bar Row',
      'Machine Row',
      'Single-Arm Cable Row',
      'Seal Row',
      'Smith Machine Row',
      'Meadows Row'
    ],
    Pulldowns: [
      'Lat Pulldown',
      'Neutral Grip Pulldown',
      'Reverse Grip Pulldown',
      'Straight-Arm Pulldown',
      'Assisted Pull-up',
      'Pull-up',
      'Chin-up'
    ],
    Posterior: [
      'Deadlift',
      'Romanian Deadlift',
      'Back Extension',
      'Hyperextension',
      'Rack Pull'
    ],
    Traps: [
      'Barbell Shrug',
      'Dumbbell Shrug',
      'Upright Row'
    ]
  },
  Shoulders: {
    Presses: [
      'Overhead Press',
      'Dumbbell Shoulder Press',
      'Machine Shoulder Press',
      'Arnold Press',
      'Push Press',
      'Behind the Neck Press',
      'Landmine Shoulder Press'
    ],
    Raises: [
      'Lateral Raise',
      'Front Raise',
      'Cable Lateral Raise',
      'Machine Lateral Raise',
      'Plate Front Raise'
    ],
    RearDelts: [
      'Rear Delt Fly',
      'Face Pull',
      'Reverse Pec Deck',
      'Bent-over Dumbbell Reverse Fly'
    ]
  },
  Legs: {
    SquatPatterns: [
      'Back Squat',
      'Front Squat',
      'Goblet Squat',
      'Zercher Squat',
      'Bulgarian Split Squat',
      'Split Squat',
      'Box Squat'
    ],
    Machines: [
      'Leg Press',
      'Hack Squat',
      'Pendulum Squat',
      'V-Squat',
      'Leg Extension',
      'Leg Curl',
      'Hip Abductor Machine',
      'Hip Adductor Machine',
      'Belt Squat',
      'Sissy Squat Machine'
    ],
    GlutesHamstrings: [
      'Hip Thrust',
      'Romanian Deadlift',
      'Glute Bridge',
      'Glute Kickback',
      'Nordic Hamstring Curl',
      'Good Morning',
      'Single-Leg RDL'
    ],
    Lunges: [
      'Walking Lunge',
      'Reverse Lunge',
      'Step-up'
    ],
    Calves: [
      'Standing Calf Raise',
      'Seated Calf Raise',
      'Donkey Calf Raise',
      'Leg Press Calf Raise'
    ]
  },
  Arms: {
    Biceps: [
      'Barbell Curl',
      'Dumbbell Curl',
      'Hammer Curl',
      'EZ Bar Curl',
      'Incline Dumbbell Curl',
      'Spider Curl',
      'Concentration Curl',
      'Cable Curl',
      'Machine Bicep Curl',
      'Bayesian Curl',
      'Preacher Curl'
    ],
    Triceps: [
      'Triceps Pushdown',
      'Overhead Triceps Extension',
      'Skull Crusher',
      'Close-Grip Bench Press',
      'Triceps Kickback',
      'French Press',
      'JM Press',
      'Machine Tricep Extension',
      'Cable Overhead Extension',
      'Dip Machine',
      'Diamond Push-up'
    ],
    Forearms: [
      'Farmer Carry',
      'Wrist Curl',
      'Reverse Curl',
      'Zottman Curl',
      'Wrist Roller'
    ]
  },
  Core: {
    Stability: [
      'Plank',
      'Side Plank',
      'Dead Bug',
      'Ab Wheel Rollout',
      'Suitcase Carry'
    ],
    Flexion: [
      'Crunch',
      'Cable Crunch',
      'Machine Crunch',
      'Decline Crunch',
      'Hanging Knee Raise',
      'Leg Raise (Captain\'s Chair)',
      'Toes to Bar',
      'V-up'
    ],
    Rotation: [
      'Pallof Press',
      'Russian Twist',
      'Cable Woodchopper',
      'Landmine Rotation',
      'Bicycle Crunch'
    ]
  },
  Cardio: {
    Machines: [
      'Treadmill',
      'Stationary Bike',
      'Rowing Machine',
      'Stairmaster',
      'Elliptical',
      'Assault Bike',
      'SkiErg',
      'Recumbent Bike',
      'Jacob\'s Ladder',
      'Curve Treadmill'
    ],
    Conditioning: [
      'Jump Rope',
      'Incline Walk',
      'Intervals'
    ]
  }
};

async function seed() {
  console.log('Starting seed...');
  let count = 0;

  for (const [category, subcats] of Object.entries(exerciseCatalog)) {
    for (const [subcategory, exercises] of Object.entries(subcats)) {
      for (const name of exercises) {
        const slug = slugify(name);

        const { error } = await supabase
          .from('exercises')
          .upsert({
            name,
            slug,
            category,
            subcategory,
            description: `A standard ${subcategory} exercise for ${category}.`
          }, { onConflict: 'slug' });

        if (error) {
          console.error(`Error inserting ${name}:`, error.message);
        } else {
          console.log(`Inserted: ${name}`);
          count++;
        }
      }
    }
  }

  console.log(`Finished! Seeded ${count} exercises.`);
}

seed();

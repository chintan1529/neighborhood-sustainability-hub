const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// 1. Load Environment Variables
const envPath = path.resolve(__dirname, "../.env.local");
let envContent = "";

try {
  envContent = fs.readFileSync(envPath, "utf8");
} catch (e) {
  console.error(
    "❌ Could not read .env.local file. Please make sure it exists.",
  );
  process.exit(1);
}

const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

// 2. Initialize Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const BUCKETS = [
  { name: "report-photos", public: true },
  { name: "avatars", public: true },
  { name: "assets", public: true },
];

async function initStorage() {
  console.log("📦 Initializing Storage Buckets...");

  for (const bucket of BUCKETS) {
    const { data, error } = await supabase.storage.getBucket(bucket.name);

    if (error && error.message.includes("not found")) {
      // Create bucket
      const { data: created, error: createError } =
        await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 5242880, // 5MB
        });

      if (createError) {
        console.error(
          `❌ Failed to create bucket '${bucket.name}':`,
          createError.message,
        );
      } else {
        console.log(`✅ Created bucket: ${bucket.name}`);
      }
    } else if (data) {
      console.log(`ℹ️  Bucket '${bucket.name}' already exists.`);

      // Ensure public
      if (data.public !== bucket.public) {
        await supabase.storage.updateBucket(bucket.name, {
          public: bucket.public,
        });
        console.log(`   Corrected public access for '${bucket.name}'`);
      }
    } else {
      console.error(
        `❌ Error checking bucket '${bucket.name}':`,
        error?.message,
      );
    }
  }

  console.log("\n🎉 Storage setup complete!");
}

initStorage();

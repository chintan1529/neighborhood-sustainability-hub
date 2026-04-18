/**
 * Fix Script for NHS Database
 *
 * This script uses the Service Role Key to bypass RLS and:
 * 1. Creates a default neighborhood if none exists
 * 2. Updates all user profiles to be assigned to this neighborhood
 *
 * Run with: node scripts/fix-database.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load Environment Variables
const envPath = path.resolve(__dirname, "../.env.local");
let envContent = "";

try {
  envContent = fs.readFileSync(envPath, "utf8");
} catch (e) {
  console.error("❌ Could not read .env.local file.");
  process.exit(1);
}

const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// Initialize Admin Client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixDatabase() {
  console.log("🔧 Starting database fix...\n");

  // Step 1: Check if any neighborhood exists
  const { data: existingNeighborhoods, error: fetchError } = await supabase
    .from("neighborhoods")
    .select("id, name")
    .limit(1);

  if (fetchError) {
    console.error("❌ Error fetching neighborhoods:", fetchError.message);
    process.exit(1);
  }

  let neighborhoodId;

  if (!existingNeighborhoods || existingNeighborhoods.length === 0) {
    console.log("ℹ️  No neighborhoods found. Creating default...");

    const { data: newNeighborhood, error: createError } = await supabase
      .from("neighborhoods")
      .insert({
        name: "Green Valley Apartments",
        slug: "green-valley",
        description: "A sustainable community in Bangalore",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560001",
        latitude: 12.9716,
        longitude: 77.5946,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Error creating neighborhood:", createError.message);
      process.exit(1);
    }

    neighborhoodId = newNeighborhood.id;
    console.log(
      `✅ Created neighborhood: ${newNeighborhood.name} (${neighborhoodId})`,
    );
  } else {
    neighborhoodId = existingNeighborhoods[0].id;
    console.log(
      `✅ Found existing neighborhood: ${existingNeighborhoods[0].name} (${neighborhoodId})`,
    );
  }

  // Step 2: Update all profiles that have NULL neighborhood_id
  const { data: updatedProfiles, error: updateError } = await supabase
    .from("profiles")
    .update({ neighborhood_id: neighborhoodId })
    .is("neighborhood_id", null)
    .select("id");

  if (updateError) {
    console.error("❌ Error updating profiles:", updateError.message);
    process.exit(1);
  }

  const count = updatedProfiles?.length || 0;
  console.log(`✅ Updated ${count} profile(s) with missing neighborhood.`);

  // Step 3: Verify
  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("id, neighborhood_id")
    .is("neighborhood_id", null);

  if (profileCheck && profileCheck.length > 0) {
    console.warn(
      `⚠️  ${profileCheck.length} profiles still have NULL neighborhood.`,
    );
  } else {
    console.log("✅ All profiles now have a neighborhood assigned.");
  }

  console.log("\n🎉 Database fix complete! You can now submit reports.");
}

fixDatabase();

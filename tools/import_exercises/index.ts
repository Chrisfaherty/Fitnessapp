#!/usr/bin/env tsx
/**
 * Exercise Import Tool
 * Downloads the free-exercise-db dataset and imports exercises into Supabase.
 *
 * Usage:
 *   pnpm tsx tools/import_exercises/index.ts [--limit 30] [--upload-images]
 *
 * Options:
 *   --limit N         Import only N exercises (default: all)
 *   --upload-images   Upload exercise images to Supabase Storage
 *   --dry-run         Preview without inserting
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const DATASET_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const STORAGE_BUCKET = "exercise-media";

interface RawExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

interface ExerciseRow {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  image_paths: string[];
  source: string;
}

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit=") || a === "--limit");
const limit = limitArg
  ? parseInt(limitArg.includes("=") ? limitArg.split("=")[1] : args[args.indexOf("--limit") + 1])
  : undefined;
const uploadImages = args.includes("--upload-images");
const dryRun = args.includes("--dry-run");

async function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  imageUrl: string,
  storagePath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, async (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.from(c)));
      res.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (error) reject(error);
        else {
          const { data } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath);
          resolve(data.publicUrl);
        }
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("📥 Fetching exercise dataset…");
  const rawData = (await fetchJson(DATASET_URL)) as RawExercise[];
  const exercises = limit ? rawData.slice(0, limit) : rawData;
  console.log(`📋 Processing ${exercises.length} exercises…`);

  const rows: ExerciseRow[] = [];

  for (const ex of exercises) {
    let imagePaths: string[] = [];

    if (uploadImages && ex.images.length > 0) {
      console.log(`  🖼️  Uploading images for: ${ex.name}`);
      for (let i = 0; i < ex.images.length; i++) {
        const imageUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/${ex.images[i]}`;
        const storagePath = `exercises/${ex.id}/${i}.jpg`;
        try {
          const url = await uploadImage(supabase, imageUrl, storagePath);
          imagePaths.push(url);
        } catch (e) {
          console.warn(`  ⚠️  Failed to upload image ${i} for ${ex.id}: ${e}`);
        }
      }
    } else {
      // Store original paths for local reference
      imagePaths = ex.images;
    }

    rows.push({
      id: ex.id,
      name: ex.name,
      force: ex.force ?? null,
      level: ex.level,
      mechanic: ex.mechanic ?? null,
      equipment: ex.equipment ?? null,
      category: ex.category,
      primary_muscles: ex.primaryMuscles,
      secondary_muscles: ex.secondaryMuscles,
      instructions: ex.instructions,
      image_paths: imagePaths,
      source: "free-exercise-db",
    });
  }

  if (dryRun) {
    console.log("🔍 Dry run — first 3 rows:");
    console.log(JSON.stringify(rows.slice(0, 3), null, 2));
    return;
  }

  // Batch upsert (Supabase max ~500 rows per call)
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("exercises")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`❌ Batch ${i / BATCH + 1} failed:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r✅ Imported ${inserted}/${rows.length} exercises`);
    }
  }

  console.log(`\n🎉 Done! Imported ${inserted} exercises.`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

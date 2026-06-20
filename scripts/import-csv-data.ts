/**
 * Script to import CSV data into Supabase
 * Usage: npx ts-node scripts/import-csv-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as csv from "csv-parse/sync";

const supabaseUrl = process.env.SUPABASE_URL || "http://localhost:54321";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzAwMDAwMCwiZXhwIjo3OTcwNDAwMDB9.abc123";

const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVRow {
  العائلة: string;
  "اسم المنتج": string;
  OFFERE: string;
  "Account Type": string;
  "Offer Type": string;
  Duration: string;
  Description: string;
  "Delivery Method": string;
  "Logo URL": string;
  "السعر (USD)": string;
  "السعر (DZD)": string;
  "عدد المبيعات": string;
  المصدر: string;
  الرابط: string;
}

async function importCSVData() {
  try {
    console.log("🚀 Starting CSV import...");

    // Read CSV file
    const csvPath = path.join(__dirname, "../public/prod_list_unified_updated-Products.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as CSVRow[];

    console.log(`📊 Found ${records.length} records in CSV`);

    // Get or create categories
    const { data: categories } = await supabase.from("categories").select("id, name");
    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

    // Create products grouped by family
    const familyMap = new Map<string, CSVRow[]>();
    for (const record of records) {
      const family = record.العائلة?.trim() || "Other";
      if (!familyMap.has(family)) {
        familyMap.set(family, []);
      }
      familyMap.get(family)!.push(record);
    }

    console.log(`👨‍👩‍👧‍👦 Found ${familyMap.size} families`);

    let productsCreated = 0;
    let offersCreated = 0;

    for (const [family, items] of familyMap) {
      console.log(`\n📦 Processing family: ${family} (${items.length} items)`);

      // Create one product per family
      const productName = family;
      const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      
      // Get category ID
      let categoryId = categoryMap.get("Digital");
      if (family.toLowerCase().includes("netflix") || family.toLowerCase().includes("spotify")) {
        categoryId = categoryMap.get("Streaming");
      } else if (family.toLowerCase().includes("chatgpt") || family.toLowerCase().includes("claude")) {
        categoryId = categoryMap.get("AI & Software");
      }

      const { data: product, error: productError } = await supabase
        .from("products")
        .upsert(
          {
            name: productName,
            slug,
            family,
            category_id: categoryId,
            short_description: `${items.length} عرض متاح`,
            description: `مجموعة من العروض المتاحة لـ ${family}`,
            main_image: items[0]?.["Logo URL"] || null,
            visible: true,
            featured: false,
            delivery_type: "manual",
          },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (productError) {
        console.error(`❌ Error creating product for ${family}:`, productError);
        continue;
      }

      if (!product) {
        console.error(`❌ No product returned for ${family}`);
        continue;
      }

      productsCreated++;
      console.log(`✅ Created product: ${productName}`);

      // Create offers for each item
      for (const item of items) {
        const offerName = item["اسم المنتج"] || item.OFFERE || family;
        const duration = item.Duration || "1 Month";
        const priceDzd = item["السعر (DZD)"] ? parseInt(item["السعر (DZD)"]) : null;
        const priceUsd = item["السعر (USD)"] ? parseFloat(item["السعر (USD)"]) : 1;
        const supplier = item.المصدر || "Unknown";
        const accountType = item["Account Type"] || null;
        const offerType = item["Offer Type"] || null;
        const deliveryMethod = item["Delivery Method"] || "Account Access";

        const { error: offerError } = await supabase
          .from("product_offers")
          .insert({
            product_id: product.id,
            name: offerName,
            duration,
            price_dzd: priceDzd,
            price_usd: priceUsd,
            stock: 100, // Default stock
            delivery_type: "manual",
            delivery_method: deliveryMethod,
            supplier,
            account_type: accountType,
            offer_type: offerType,
            active: true,
            sort_order: 0,
          });

        if (offerError) {
          console.error(`  ❌ Error creating offer: ${offerName}`, offerError);
        } else {
          offersCreated++;
        }
      }
    }

    console.log(`\n✨ Import complete!`);
    console.log(`📊 Summary:`);
    console.log(`  - Products created: ${productsCreated}`);
    console.log(`  - Offers created: ${offersCreated}`);
    console.log(`  - Families: ${familyMap.size}`);

  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

importCSVData();

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import AdmZip from "adm-zip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOAD_DIR = "public/uploads/lessons/adapt";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const blockId = formData.get("blockId") as string || randomUUID();

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "Only ZIP files are supported" }, { status: 400 });
    }

    // Prepare paths
    const courseDir = path.join(process.cwd(), UPLOAD_DIR, blockId);
    
    // Create directory
    await fs.mkdir(courseDir, { recursive: true });

    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract ZIP
    const zip = new AdmZip(buffer);
    zip.extractAllTo(courseDir, true);

    // Check for index.html
    const hasIndex = (await fs.readdir(courseDir)).includes("index.html");
    if (!hasIndex) {
      // Sometimes Adapt exports are nested in a folder inside the ZIP
      const subdirs = await fs.readdir(courseDir, { withFileTypes: true });
      const mainSubdir = subdirs.find(d => d.isDirectory());
      if (mainSubdir) {
        // Move contents up if needed (optional logic, but index.html is expected at root)
      }
    }

    const indexUrl = `/uploads/lessons/adapt/${blockId}/index.html`;

    return NextResponse.json({ 
      success: true, 
      url: indexUrl,
      blockId,
      title: file.name.replace(".zip", "")
    });

  } catch (error: any) {
    console.error("Adapt upload error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to process Adapt package" 
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(req: NextRequest) {
  try {
    const { cardData } = await req.json();
    if (!cardData || typeof cardData !== "object") {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
    }

    // Clone cardData to modify polaroid image paths safely
    const updatedCardData = JSON.parse(JSON.stringify(cardData));

    // Ensure public/photos directory exists
    const publicPhotosDir = path.join(process.cwd(), "public", "photos");
    await fs.mkdir(publicPhotosDir, { recursive: true });

    // Process any base64 images in polaroids
    if (Array.isArray(updatedCardData.polaroids)) {
      for (let i = 0; i < updatedCardData.polaroids.length; i++) {
        const p = updatedCardData.polaroids[i];
        if (p && typeof p.image === "string" && p.image.startsWith("data:image/")) {
          try {
            const matches = p.image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
              const base64Data = matches[2];
              const buffer = Buffer.from(base64Data, "base64");
              const filename = `polaroid_${i + 1}.${ext}`;
              const imageFilePath = path.join(publicPhotosDir, filename);

              await fs.writeFile(imageFilePath, buffer);
              updatedCardData.polaroids[i].image = `/photos/${filename}`;
            }
          } catch (imgError) {
            console.error(`Error saving image for polaroid ${i}:`, imgError);
          }
        }
      }
    }

    // Path to /lib/card-data.ts
    const filePath = path.join(process.cwd(), "lib", "card-data.ts");
    let fileContent = await fs.readFile(filePath, "utf-8");

    // We want to replace DEFAULT_CARD_DATA
    const marker = "export const DEFAULT_CARD_DATA: CardData =";
    const startIndex = fileContent.indexOf(marker);

    if (startIndex === -1) {
      return NextResponse.json({ success: false, error: "Marker not found in file" }, { status: 500 });
    }

    // Find the end of DEFAULT_CARD_DATA: it ends before the encoder helper
    const nextMarker = "// UTF-8 and URI-safe Base64 encoder helper";
    const endIndex = fileContent.indexOf(nextMarker);

    if (endIndex === -1) {
      return NextResponse.json({ success: false, error: "End marker not found in file" }, { status: 500 });
    }

    // Format updatedCardData beautifully
    const formattedData = JSON.stringify(updatedCardData, null, 2);

    // Build the new file contents
    const beforePart = fileContent.substring(0, startIndex);
    const afterPart = fileContent.substring(endIndex);
    const newContent = `${beforePart}${marker} ${formattedData};\n\n${afterPart}`;

    await fs.writeFile(filePath, newContent, "utf-8");

    return NextResponse.json({ success: true, cardData: updatedCardData });
  } catch (error: any) {
    console.error("Error saving card config:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


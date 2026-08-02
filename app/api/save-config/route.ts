import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(req: NextRequest) {
  try {
    const { cardData } = await req.json();
    if (!cardData || typeof cardData !== "object") {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
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

    // Format cardData beautifully
    const formattedData = JSON.stringify(cardData, null, 2);

    // Build the new file contents
    const beforePart = fileContent.substring(0, startIndex);
    const afterPart = fileContent.substring(endIndex);
    const newContent = `${beforePart}${marker} ${formattedData};\n\n${afterPart}`;

    await fs.writeFile(filePath, newContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving card config:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(req: NextRequest) {
  try {
    const { cardData } = await req.json();
    if (!cardData || typeof cardData !== "object") {
      return NextResponse.json({ success: false, error: "Données invalides" }, { status: 400 });
    }

    // Clone cardData to modify polaroid image paths safely
    const updatedCardData = JSON.parse(JSON.stringify(cardData));

    // If running on Vercel / Read-Only serverless environment, fs modifications will fail.
    // Handle gracefully so the user is informed to use the "Générer le Lien" feature instead of showing raw node errors.
    const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true" || !!process.env.NEXT_PUBLIC_VERCEL_ENV;

    if (isVercel) {
      return NextResponse.json({
        success: true,
        isServerless: true,
        cardData: updatedCardData,
        message: "Sur Vercel, le serveur est en lecture seule. Utilisez le bouton 'Générer le Lien 🔗' pour partager directement cette carte !",
      });
    }

    try {
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

      if (startIndex !== -1) {
        const nextMarker = "// UTF-8 and URI-safe Base64 encoder helper";
        const endIndex = fileContent.indexOf(nextMarker);

        if (endIndex !== -1) {
          const formattedData = JSON.stringify(updatedCardData, null, 2);
          const beforePart = fileContent.substring(0, startIndex);
          const afterPart = fileContent.substring(endIndex);
          const newContent = `${beforePart}${marker} ${formattedData};\n\n${afterPart}`;

          await fs.writeFile(filePath, newContent, "utf-8");
        }
      }

      return NextResponse.json({ success: true, cardData: updatedCardData });
    } catch (fsError: any) {
      console.warn("File write failed (serverless environment):", fsError.message);
      return NextResponse.json({
        success: true,
        isServerless: true,
        cardData: updatedCardData,
        message: "Enregistré localement ! Sur Vercel, utilisez le bouton 'Générer le Lien 🔗' pour la partager.",
      });
    }
  } catch (error: any) {
    console.error("Error saving card config:", error);
    return NextResponse.json({ success: false, error: error.message || "Erreur serveur" }, { status: 500 });
  }
}



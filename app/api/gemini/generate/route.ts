import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Google Gen AI client with the server-side API key.
// The SDK is loaded lazily and handles missing API keys gracefully.
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const { recipientName, prompt, tone, language = "fr" } = await req.json();

    if (!recipientName) {
      return NextResponse.json(
        { error: "Le nom du destinataire est requis." },
        { status: 400 }
      );
    }

    const ai = getAiClient();

    // Construct a highly contextual, warm prompt for generating the romantic/birthday message
    const systemPrompt = `Tu es un assistant attentionné, poétique et romantique spécialisé dans la rédaction de lettres de vœux d'anniversaire et de messages d'amour chaleureux.
L'utilisateur veut envoyer une carte interactive d'anniversaire à sa petite amie nommée "${recipientName}".
Rédige un message touchant, sincère et profond qui exprime à quel point elle compte énormément pour lui. Évite les clichés niais et privilégie une écriture élégante, sincère, chaleureuse et poétique.
Le ton demandé est : ${tone || "romantique et chaleureux"}.
Langue de rédaction : ${language === "en" ? "Anglais" : "Français"}.
Détails supplémentaires fournis par l'utilisateur : ${prompt || "Aucun détail particulier, concentre-toi sur un vœu d'anniversaire sincère et mémorable."}

Règles cruciales :
1. Ne dépasse pas 150 mots pour que le texte rentre parfaitement sur la carte de vœux.
2. Structure le texte avec des paragraphes courts.
3. Commence directement par "Chère ${recipientName}," ou "Dear ${recipientName}," et termine par une douce signature ou formule de conclusion chaleureuse (ex: "Avec tout mon amour", "À toi pour toujours", etc.).
4. Pas de balisage markdown complexe, pas de titres H1/H2, juste des retours à la ligne simples.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: systemPrompt,
      config: {
        temperature: 0.85,
        maxOutputTokens: 300,
      }
    });

    const text = response.text || "";
    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return NextResponse.json(
      {
        error: "Une erreur est survenue lors de la génération du message par l'IA.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

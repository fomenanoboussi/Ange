export interface PolaroidData {
  id: string;
  image: string;
  caption: string;
}

export interface CardData {
  recipient: string;
  message: string;
  cassetteTitle: string;
  surpriseText: string;
  polaroids: PolaroidData[];
  selectedSongId: string;
  envelopeTheme?: string; // 'burgundy' | 'emerald' | 'blush' | 'classic' | 'midnight'
  sealEmblem?: string; // 'heart' | 'star' | 'rose' | 'crown'
}

export interface SongOption {
  id: string;
  name: string;
  description: string;
  notes: { note: string; duration: number }[]; // Notes for Web Audio API sequencer!
  audioUrl?: string; // Optional direct high quality MP3 stream URL
}

// Preset romantic songs for our Web Audio API Music Box synthesizer!
export const SONGS: SongOption[] = [
  {
    id: "perfect",
    name: "Perfect (Ed Sheeran)",
    description: "La douce mélodie romantique de Ed Sheeran jouée à la boîte à musique ou en version haute qualité.",
    audioUrl: "https://archive.org/download/ed-sheeran-perfect-official-music-video_202512/Ed%20Sheeran%20-%20Perfect%20(Official%20Music%20Video).mp3",
    notes: [
      { note: "G4", duration: 0.4 },
      { note: "A4", duration: 0.4 },
      { note: "C5", duration: 0.6 },
      { note: "C5", duration: 0.2 },
      { note: "B4", duration: 0.4 },
      { note: "A4", duration: 0.4 },
      { note: "G4", duration: 0.8 },
      { note: "G4", duration: 0.4 },
      { note: "A4", duration: 0.4 },
      { note: "C5", duration: 0.6 },
      { note: "C5", duration: 0.2 },
      { note: "D5", duration: 0.4 },
      { note: "B4", duration: 0.8 },
      { note: "A4", duration: 0.4 },
      { note: "G4", duration: 0.8 },
      { note: "C5", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "D5", duration: 0.4 },
      { note: "E5", duration: 0.6 },
      { note: "D5", duration: 0.2 },
      { note: "C5", duration: 0.4 },
      { note: "A4", duration: 0.8 },
      { note: "C5", duration: 0.4 },
      { note: "D5", duration: 0.4 },
      { note: "E5", duration: 0.6 },
      { note: "D5", duration: 0.2 },
      { note: "C5", duration: 0.4 },
      { note: "G4", duration: 1.2 },
      { note: "C5", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "D5", duration: 0.4 },
      { note: "E5", duration: 0.8 },
      { note: "D5", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "D5", duration: 0.4 },
      { note: "E5", duration: 0.4 },
      { note: "D5", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "A4", duration: 1.2 },
      { note: "G4", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "D5", duration: 0.4 },
      { note: "E5", duration: 0.4 },
      { note: "D5", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "D5", duration: 0.6 },
      { note: "E5", duration: 0.2 },
      { note: "D5", duration: 0.4 },
      { note: "C5", duration: 0.4 },
      { note: "D5", duration: 0.4 },
      { note: "C5", duration: 1.6 },
    ],
  },
];

export const DEFAULT_CARD_DATA: CardData = {
  recipient: "Ange",
  message: "Chère Ange,\n\nJe voulais t'écrire ces quelques mots du plus profond de mon cœur pour te dire à quel point tu comptes énormément pour moi.\n\nTu es mon ange gardien, ma plus douce pensée et mon plus beau sourire de chaque jour. Ta simple présence illumine ma vie et donne une saveur si unique à chaque seconde que nous partageons. Sans toi, mon monde serait infiniment moins doux, moins coloré et tellement moins vivant. Merci d'être cette personne si précieuse, si extraordinaire, et de faire vibrer mon cœur si fort au quotidien.\n\nSache que je serai toujours là pour toi, à chaque pas, à chaque rire et dans chacun de tes rêves. Tu es tout pour moi.\n\nJe t'aime tendrement et pour toujours, de tout mon cœur, 💖",
  cassetteTitle: "Notre Douce Mélodie ♫",
  surpriseText: "Surprise ! J'ai une surprise pour toi cette semaine... J'espère de tout cœur qu'elle te plaira ! 🧸❤️",
  selectedSongId: "perfect",
  envelopeTheme: "classic",
  sealEmblem: "heart",
  polaroids: [
    {
      id: "p1",
      image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop",
      caption: "Ton doux sourire...",
    },
    {
      id: "p2",
      image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600&auto=format&fit=crop",
      caption: "...illumine ma vie...",
    },
    {
      id: "p3",
      image: "https://images.unsplash.com/photo-1559251606-c623743a6d76?q=80&w=600&auto=format&fit=crop",
      caption: "...à travers chaque moment...",
    },
    {
      id: "p4",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
      caption: "...tu es dans mon cœur.",
    },
  ],
};

// UTF-8 and URI-safe Base64 encoder helper
export function encodeCardData(data: CardData): string {
  try {
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
    return base64;
  } catch (error) {
    console.error("Error encoding card data:", error);
    return "";
  }
}

// UTF-8 and URI-safe Base64 decoder helper
export function decodeCardData(base64Str: string): CardData | null {
  try {
    const decodedStr = decodeURIComponent(
      atob(base64Str)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(decodedStr);
    
    // Perform loose structural validation to ensure safety and completeness
    if (parsed && typeof parsed === "object" && "recipient" in parsed) {
      return {
        ...DEFAULT_CARD_DATA,
        ...parsed,
        polaroids: Array.isArray(parsed.polaroids)
          ? parsed.polaroids.map((p: any, i: number) => ({
              ...DEFAULT_CARD_DATA.polaroids[i],
              ...p,
            }))
          : DEFAULT_CARD_DATA.polaroids,
      };
    }
    return null;
  } catch (error) {
    console.error("Error decoding card data:", error);
    return null;
  }
}

// Frequencies map for Web Audio API Synth notes
export const NOTE_FREQUENCIES: Record<string, number> = {
  "A3": 220.00, "A#3": 233.08, "B3": 246.94,
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77,
};

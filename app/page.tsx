"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Music,
  Image as ImageIcon,
  Gift,
  ChevronLeft,
  Sparkles,
  Share2,
  Settings,
  Check,
  Copy,
  Volume2,
  VolumeX,
  X,
  Mail,
  Undo,
  Upload,
  Plus,
  Trash2
} from "lucide-react";
import {
  CardData,
  PolaroidData,
  DEFAULT_CARD_DATA,
  SONGS,
  NOTE_FREQUENCIES,
  decodeCardData,
  encodeCardData
} from "@/lib/card-data";

export default function Home() {
  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <CardApp />
    </React.Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8f4ec] text-[#8b7355]">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <Heart className="w-12 h-12 text-rose-500 fill-rose-200" />
      </motion.div>
      <p className="mt-4 font-serif text-lg italic">Chargement magique...</p>
    </div>
  );
}

// Helper to compress local images to a small Base64 string so it fits nicely in the URL share parameters
const compressImage = (file: File, maxWidth = 400, maxHeight = 400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7); // compress as jpeg with 70% quality
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

function CardApp() {
  const searchParams = useSearchParams();
  
  // Core state of the card
  const [cardData, setCardData] = useState<CardData>(DEFAULT_CARD_DATA);
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<"envelope" | "letter" | "cassette" | "polaroid" | "surprise">("envelope");
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  
  // Customizer/Editor UI State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  
  // Added states for extra immersion and interactive gamified feel
  const [isGiftBoxOpened, setIsGiftBoxOpened] = useState(false);
  const [selectedPolaroid, setSelectedPolaroid] = useState<PolaroidData | null>(null);
  const [burstParticles, setBurstParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);
  
  // Gemini API states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("romantique");
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [aiError, setAiError] = useState("");

  // Save to project states
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [saveProjectStatus, setSaveProjectStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveProjectErrorMessage, setSaveProjectErrorMessage] = useState("");

  // Web Audio Synth references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeTimelineRef = useRef<NodeJS.Timeout[]>([]);
  const realAudioRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio Music Box Synthesizer
  const playSynthNote = (note: string, duration: number) => {
    try {
      if (typeof window === "undefined") return;
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const freq = NOTE_FREQUENCIES[note];
      if (!freq) return;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Triangle wave replicates the beautiful, warm sound of a physical music box
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Music box envelope: rapid attack, long exponential decay chime
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration + 0.4);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.5);
    } catch (err) {
      console.error("Audio Synthesis Error:", err);
    }
  };

  const stopSequence = () => {
    setIsPlayingMusic(false);
    activeTimelineRef.current.forEach((t) => clearTimeout(t));
    activeTimelineRef.current = [];
    if (realAudioRef.current) {
      realAudioRef.current.pause();
      realAudioRef.current.currentTime = 0;
    }
  };

  const scheduleSynthNotes = (song: any) => {
    let cumulativeTime = 0;
    const timers: NodeJS.Timeout[] = [];

    const scheduleLoop = () => {
      cumulativeTime = 0;
      song.notes.forEach((noteObj: any) => {
        const noteTime = cumulativeTime;
        const t = setTimeout(() => {
          playSynthNote(noteObj.note, noteObj.duration);
        }, noteTime * 1000);
        timers.push(t);
        cumulativeTime += noteObj.duration;
      });

      // Loop song when it finishes
      const loopTimer = setTimeout(() => {
        scheduleLoop();
      }, cumulativeTime * 1000);
      timers.push(loopTimer);
    };

    scheduleLoop();
    activeTimelineRef.current = timers;
  };

  const startSequence = (songIdOverride?: string) => {
    stopSequence();
    setIsPlayingMusic(true);

    const targetSongId = songIdOverride || cardData.selectedSongId;
    const song = SONGS.find((s) => s.id === targetSongId) || SONGS[0];

    if (song.audioUrl) {
      if (!realAudioRef.current) {
        realAudioRef.current = new Audio(song.audioUrl);
        realAudioRef.current.loop = true;
      } else if (realAudioRef.current.src !== song.audioUrl) {
        realAudioRef.current.src = song.audioUrl;
        realAudioRef.current.loop = true;
      }
      
      // Handle loading or CORS failures gracefully with a fallback
      realAudioRef.current.onerror = () => {
        console.warn("Real audio failed to load. Falling back to music box synthesizer.");
        scheduleSynthNotes(song);
      };

      realAudioRef.current.play().catch((err) => {
        console.error("Audio playback error (browser policy might block autoplay):", err);
        // Fallback to synth
        scheduleSynthNotes(song);
      });
    } else {
      scheduleSynthNotes(song);
    }
  };

  const toggleMusic = () => {
    if (isPlayingMusic) {
      stopSequence();
    } else {
      startSequence();
    }
  };

  const handlePhotoClick = (polaroid: PolaroidData) => {
    setSelectedPolaroid(polaroid);
    // Switch the active song to Ed Sheeran's Perfect
    setCardData((prev) => ({ ...prev, selectedSongId: "perfect" }));
    // Play immediately
    setTimeout(() => {
      startSequence("perfect");
    }, 40);
  };

  const handleOpenEnvelope = () => {
    // Play a happy magical chime chord
    setTimeout(() => playSynthNote("C4", 0.12), 0);
    setTimeout(() => playSynthNote("E4", 0.12), 60);
    setTimeout(() => playSynthNote("G4", 0.12), 120);
    setTimeout(() => playSynthNote("C5", 0.25), 180);

    // Generate burst particles radiating outwards from the center of the seal
    const newParticles = Array.from({ length: 18 }).map((_, i) => {
      const angle = (i * 2 * Math.PI) / 18 + (Math.random() * 0.4 - 0.2);
      const speed = Math.random() * 4 + 4;
      return {
        id: Date.now() + i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
    setBurstParticles(newParticles);

    // Open envelope flap slightly after chime starts
    setTimeout(() => {
      setIsEnvelopeOpen(true);
    }, 150);

    // Clean up particles
    setTimeout(() => {
      setBurstParticles([]);
    }, 900);
  };

  // Change current playing song
  const handleSongChange = (songId: string) => {
    setCardData({ ...cardData, selectedSongId: songId });
    // If already playing, immediately play the new song
    if (isPlayingMusic) {
      setTimeout(() => {
        startSequence();
      }, 50);
    }
  };

  // Load card data from query params if present (presentation mode) or localStorage (authoring draft)
  useEffect(() => {
    const cardParam = searchParams.get("card");
    if (cardParam) {
      const decoded = decodeCardData(cardParam);
      if (decoded) {
        setTimeout(() => {
          setCardData(decoded);
          setIsPresentationMode(true);
        }, 0);
      }
    } else {
      // Not in presentation mode, load draft from localStorage if present
      const saved = localStorage.getItem("custom_card_data");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setTimeout(() => {
              setCardData(parsed);
            }, 0);
          }
        } catch (e) {
          console.error("Failed to load saved draft:", e);
        }
      }
    }
  }, [searchParams]);

  // Save card data draft to localStorage on every change (if not in presentation mode)
  useEffect(() => {
    if (isPresentationMode) return;
    const cardParam = searchParams.get("card");
    if (!cardParam) {
      localStorage.setItem("custom_card_data", JSON.stringify(cardData));
    }
  }, [cardData, isPresentationMode, searchParams]);

  // Clean up synth when unmounting or changing songs
  useEffect(() => {
    return () => {
      stopSequence();
    };
  }, []);

  // Gemini AI writer integration
  const handleGenerateAiLetter = async () => {
    if (!cardData.recipient.trim()) {
      setAiError("Veuillez d'abord saisir le nom de votre destinataire.");
      return;
    }
    
    setIsGeneratingLetter(true);
    setAiError("");

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: cardData.recipient,
          prompt: aiPrompt,
          tone: aiTone,
          language: "fr",
        }),
      });

      const data = await response.json();
      if (response.ok && data.text) {
        setCardData({ ...cardData, message: data.text });
        setAiPrompt(""); // Clear input on success
      } else {
        setAiError(data.error || "Une erreur s'est produite lors de la génération.");
      }
    } catch (err) {
      console.error(err);
      setAiError("Impossible de se connecter au serveur IA.");
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  // Image File Upload Helper
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          const updated = [...cardData.polaroids];
          updated[index] = {
            ...updated[index],
            image: dataUrl,
          };
          setCardData({ ...cardData, polaroids: updated });
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // Share card link generator
  const handleGenerateShareLink = () => {
    const encoded = encodeCardData(cardData);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullLink = `${origin}/?card=${encoded}`;
    setShareUrl(fullLink);
    setIsShareModalOpen(true);
    setIsCopied(false);
  };

  const handleSaveToProject = async () => {
    setIsSavingProject(true);
    setSaveProjectStatus("saving");
    setSaveProjectErrorMessage("");
    try {
      const response = await fetch("/api/save-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cardData }),
      });
      const data = await response.json();
      if (data.success) {
        if (data.cardData) {
          setCardData(data.cardData);
          try {
            localStorage.setItem("valentine_card_draft_v1", JSON.stringify(data.cardData));
          } catch (e) {
            console.error("Failed to update localStorage:", e);
          }
        }
        setSaveProjectStatus("success");
        setTimeout(() => setSaveProjectStatus("idle"), 4000);
      } else {
        setSaveProjectStatus("error");
        setSaveProjectErrorMessage(data.error || "Erreur inconnue");
      }
    } catch (err: any) {
      console.error("Save to project error:", err);
      setSaveProjectStatus("error");
      setSaveProjectErrorMessage(err.message || "Erreur de connexion réseau");
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full relative bg-[#faeed6]/30 flex flex-col items-center justify-center p-4 overflow-x-hidden md:py-8 font-sans">
      {/* Dreamy Floating Particle System */}
      <FloatingParticles />

      {/* Exquisite Top-Down Table Flatlay Decorations */}
      <TableDecorations />

      {/* Background decoration elements */}
      <div className="absolute top-4 left-4 text-xs text-[#a0896d]/60 select-none hidden md:block z-10">
        ✨ Fait avec amour pour elle
      </div>

      {/* Floating Customize Button */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setIsEditorOpen(true)}
          className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-full shadow-xl border border-rose-300/80 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Settings className="w-4 h-4 text-white animate-spin-slow" />
          <span>Personnaliser ✏️</span>
        </button>
      </div>

      {/* Main Container - Framed like a cozy iPhone screen on desktop, full-bleed on mobile */}
      <div 
        id="main-applet-container"
        className="relative w-full max-w-sm h-[680px] rounded-[36px] overflow-hidden deep-shadow border-8 border-neutral-800 flex flex-col justify-between"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, #f3e9cf 0px, #f3e9cf 12px, #faf6f0 12px, #faf6f0 24px)" }}
      >
        {/* Phone Notch/Speaker accent */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-neutral-800 rounded-b-2xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-neutral-700 rounded-full mb-1"></div>
        </div>

        {/* Outer content container */}
        <div className="relative w-full h-full flex flex-col items-center pt-8 bg-transparent overflow-hidden">
          <AnimatePresence mode="wait">
            {/* 1. ENVELOPE SCREEN */}
            {activeScreen === "envelope" && (
              <motion.div
                key="envelope-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full h-full flex flex-col items-center justify-between relative"
              >
                {!isEnvelopeOpen ? (
                  /* CLOSED ENVELOPE STATE */
                  <div className="w-full h-full flex flex-col items-center justify-between px-6 pb-8 pt-4">
                    {/* Header Section */}
                    <div className="text-center pt-4">
                      <span className="inline-block text-2xl text-[#8b7355] filter drop-shadow">🎀</span>
                      <h1 className="font-serif text-2xl font-bold text-[#6a5438] mt-1 select-none tracking-wide">
                        Pour mon amour...
                      </h1>
                    </div>

                    {/* The 3D CSS/SVG Envelope Visual */}
                    <div className="relative w-full flex flex-col items-center justify-center my-auto">
                      <div className="relative w-72 h-48 select-none" style={{ perspective: "1000px" }}>
                        
                        {/* Envelope Backplate & Inside lining with theme-specific backdrop */}
                        {(() => {
                          const theme = ENVELOPE_THEMES[cardData.envelopeTheme || "classic"] || ENVELOPE_THEMES.classic;
                          return (
                            <>
                              <div className={`absolute inset-0 ${theme.inside} rounded-xl overflow-hidden shadow-inner border border-black/10`}>
                                <div className="absolute inset-x-0 top-0 h-1/2 bg-[#faf6f0] opacity-10 origin-top transform skew-y-3"></div>
                              </div>

                              {/* Left Flap */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1/2 ${theme.left} border-r border-black/10`}
                                   style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)", zIndex: 22 }}>
                                {/* Inner Gold Foil Accent Line */}
                                <div className="absolute inset-0 bg-transparent opacity-40" 
                                     style={{ clipPath: "polygon(0 4px, calc(100% - 8px) 50%, 0 calc(100% - 4px))", borderRight: `2px solid ${theme.goldFoil}` }}></div>
                              </div>

                              {/* Right Flap */}
                              <div className={`absolute right-0 top-0 bottom-0 w-1/2 ${theme.right} border-l border-black/10`}
                                   style={{ clipPath: "polygon(100% 0, 0 50%, 100% 100%)", zIndex: 22 }}>
                                {/* Inner Gold Foil Accent Line */}
                                <div className="absolute inset-0 bg-transparent opacity-40" 
                                     style={{ clipPath: "polygon(100% 4px, 8px 50%, 100% calc(100% - 4px))", borderLeft: `2px solid ${theme.goldFoil}` }}></div>
                              </div>

                              {/* Bottom Flap */}
                              <div className={`absolute bottom-0 inset-x-0 h-3/4 ${theme.bottom} border-t border-black/10`}
                                   style={{ clipPath: "polygon(0 100%, 50% 30%, 100% 100%)", zIndex: 24 }}>
                                {/* Inner Gold Foil Accent Line */}
                                <div className="absolute inset-0 bg-transparent opacity-40" 
                                     style={{ clipPath: "polygon(4px 100%, 50% calc(30% + 6px), calc(100% - 4px) 100%)", borderTop: `2px solid ${theme.goldFoil}` }}></div>
                              </div>

                              {/* Realistic 3D Rotating Top Flap */}
                              <motion.div
                                style={{
                                  transformOrigin: "top",
                                  transformStyle: "preserve-3d",
                                  zIndex: 25,
                                  clipPath: "polygon(0 0, 50% 100%, 100% 0)",
                                }}
                                className={`absolute inset-x-0 top-0 h-2/3 ${theme.bg} border-b border-black/10`}
                              >
                                {/* Inner Gold Foil Accent Line for flap */}
                                <div className="absolute inset-x-0 top-0 h-full bg-transparent opacity-45"
                                     style={{ clipPath: "polygon(4px 0, 50% calc(100% - 8px), calc(100% - 4px) 0)", borderBottom: `2px solid ${theme.goldFoil}` }}></div>

                                {/* Back of top flap shown when rotated (using the theme-specific lining color) */}
                                <div className={`absolute inset-0 ${theme.backFlap} backface-hidden`} style={{ transform: "rotateX(180deg)", clipPath: "polygon(0 0, 50% 100%, 100% 0)" }}>
                                  <div className="absolute inset-x-0 top-0 h-full bg-transparent opacity-30"
                                       style={{ clipPath: "polygon(4px 0, 50% calc(100% - 8px), calc(100% - 4px) 0)", borderBottom: `2px dashed ${theme.goldFoil}` }}></div>
                                </div>
                              </motion.div>
                            </>
                          );
                        })()}

                        {/* Gold Wax Seal Button (Clickable when closed) */}
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.93 }}
                          onClick={handleOpenEnvelope}
                          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/6 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer shadow-lg active:scale-95 z-30"
                        >
                          <GoldWaxSealSvg emblem={cardData.sealEmblem || "heart"} />
                        </motion.button>
                      </div>

                      {/* Dynamic Instructions text */}
                      <div className="mt-8 text-center h-12">
                        <motion.p
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="text-xs font-serif italic text-[#8b7355] select-none"
                        >
                          {"(Clique sur le sceau en or pour l'ouvrir)"}
                        </motion.p>
                      </div>
                    </div>
                    
                    {/* Placeholder bottom space */}
                    <div className="h-10"></div>
                  </div>
                ) : (
                  /* OPEN ENVELOPE DASHBOARD STATE (FOLLOWS THE UPLOADED SCREENSHOT EXACTLY) */
                  <div className="w-full h-full flex flex-col justify-between relative pt-3 pb-8 select-none">
                    
                    {/* 1. Tiny Envelope sticker icon with red heart in the center */}
                    <div className="flex justify-center mt-1 z-10">
                      <div className="relative w-11 h-7 bg-white rounded-md border border-[#ebdcc8] shadow-sm flex items-center justify-center">
                        <span className="text-rose-500 text-xs animate-pulse">❤️</span>
                        {/* Envelope flap lines decoration */}
                        <div className="absolute inset-0 border-t-[0.5px] border-b-[0.5px] border-neutral-100 pointer-events-none"></div>
                        <div className="absolute left-0 bottom-0 w-1/2 h-[1px] bg-red-400 opacity-20"></div>
                        <div className="absolute right-0 bottom-0 w-1/2 h-[1px] bg-blue-400 opacity-20"></div>
                      </div>
                    </div>

                    {/* 2. Interactive Letter Card peaking out on the left */}
                    <motion.div
                      initial={{ opacity: 0, y: 50, rotate: -15, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, rotate: -3, scale: 1 }}
                      transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.1 }}
                      whileHover={{ scale: 1.04, rotate: -1, zIndex: 45 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveScreen("letter")}
                      className="absolute top-[48px] left-[18px] w-[56%] h-[165px] bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] border-2 border-dashed border-[#d2c0ad] p-3 flex flex-col justify-between cursor-pointer select-none"
                      style={{ zIndex: 10 }}
                    >
                      {/* Lined Notebook style decorative stripes */}
                      <div className="flex-1 flex flex-col">
                        <h2 className="font-serif text-[13px] font-bold text-[#4a3621] leading-tight select-none">
                          Chère {cardData.recipient.split(" ")[0] || "amour"},
                        </h2>
                        
                        {/* Custom cursive message excerpt */}
                        <p className="font-serif italic text-[10px] text-[#6a5438]/90 leading-relaxed mt-1.5 select-none line-clamp-4">
                          {cardData.message.replace(/Chère\s+[A-Za-zÀ-ÿ-\s]+,\n*/i, "").trim()}
                        </p>
                      </div>

                      {/* Clickable Action indicator */}
                      <div className="text-[9px] text-rose-500 font-serif font-semibold border-t border-dashed border-[#e8dfd3] pt-1.5 flex items-center justify-between mt-1 select-none">
                        <span>Cliquez pour lire la lettre 📜</span>
                      </div>
                    </motion.div>

                    {/* 3. Interactive Polaroid peaking out on the right with custom photo sticker */}
                    <motion.div
                      initial={{ opacity: 0, y: 60, rotate: 15, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, rotate: 6, scale: 1 }}
                      transition={{ type: "spring", stiffness: 90, damping: 12, delay: 0.2 }}
                      whileHover={{ scale: 1.04, rotate: 2, zIndex: 45 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveScreen("polaroid")}
                      className="absolute top-[64px] right-[18px] w-[42%] h-[142px] bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#ebdcc8]/60 p-1.5 flex flex-col justify-between cursor-pointer select-none"
                      style={{ zIndex: 10 }}
                    >
                      {/* Photo box inside Polaroid */}
                      <div className="relative w-full h-[102px] bg-neutral-100 rounded overflow-hidden border border-neutral-100">
                        {cardData.polaroids[0]?.image ? (
                          <img
                            src={cardData.polaroids[0].image}
                            alt="Polaroid Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-rose-50 flex items-center justify-center">
                            <span className="text-rose-400">📸</span>
                          </div>
                        )}
                        
                        {/* White label sticker on top of photo */}
                        <div className="absolute top-1 left-1 bg-white/95 border border-[#ebdcc8]/50 px-1 py-0.5 rounded shadow-sm scale-90 origin-top-left font-sans text-[7px] font-extrabold text-[#5c402b] flex items-center gap-0.5 select-none z-10">
                          Photos ! 📸
                        </div>
                      </div>

                      {/* Cute Handwriting caption */}
                      <div className="text-center py-1 select-none">
                        <span className="font-handwriting text-[10px] font-bold text-[#8b7355] leading-none whitespace-nowrap block truncate">
                          Appuyez ! 📸
                        </span>
                      </div>
                    </motion.div>

                    {/* Outer sticker label pinned across Polaroids just like in the screenshot! */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
                      animate={{ opacity: 1, scale: 1, rotate: -4 }}
                      transition={{ delay: 0.4 }}
                      className="absolute top-[170px] right-[10px] bg-white border border-[#ebdcc8] px-2 py-1 rounded shadow-md text-[8px] font-extrabold text-[#5c402b] flex items-center gap-1 select-none pointer-events-none whitespace-nowrap z-30"
                    >
                      Appuyez sur les polaroïds ! 📸
                    </motion.div>

                    {/* 4. The gorgeous floating Dark Brown Leather Pocket Base */}
                    <div 
                      className="absolute top-[196px] left-[18px] right-[18px] h-[225px] bg-[#5c402b] rounded-[24px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_12px_24px_-4px_rgba(92,64,43,0.35)] select-none border border-[#4a3220]"
                      style={{ zIndex: 15 }}
                    >
                      {/* Inner stitching/borders inside the pocket */}
                      <div className="absolute inset-1.5 rounded-[18px] border border-[#a17a58]/20 pointer-events-none"></div>
                    </div>

                    {/* 5. The exquisite Warm Cream Card harboring our Teddy Bear sitting centrally */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 110, damping: 10, delay: 0.3 }}
                      whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                      onClick={() => setActiveScreen("surprise")}
                      className="absolute top-[214px] left-1/2 transform -translate-x-1/2 w-[184px] h-[184px] bg-gradient-to-br from-[#fffdfa] via-[#fff8ef] to-[#fff3e5] rounded-2xl p-3 shadow-[0_8px_24px_rgba(92,64,43,0.18)] border-2 border-[#ebd3b5] flex items-center justify-center cursor-pointer select-none"
                      style={{ zIndex: 25 }}
                    >
                      <div className="w-full h-full relative flex items-center justify-center">
                        <TeddyBearSvg />
                        
                        {/* High fidelity subtle background pulse behind the teddy bear to give a gorgeous presentation */}
                        <div className="absolute inset-4 bg-rose-400 rounded-full blur-xl opacity-10 -z-10 animate-pulse"></div>
                      </div>

                      {/* The Pill Button overlapping the bottom edge of the Teddy bear square */}
                      <div 
                        className="absolute bottom-[-16px] left-1/2 transform -translate-x-1/2 bg-[#fffdf9] px-4 py-1.5 rounded-full border border-[#ebd6bc] shadow-md flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap z-40 active:scale-95 transition-transform hover:bg-[#fff9f0]"
                      >
                        <span className="text-[10px] font-bold text-[#5c402b] tracking-wider font-sans uppercase">{"J'ai une surprise ! 🧸"}</span>
                      </div>
                    </motion.div>

                    {/* Burst particles overlay */}
                    {burstParticles.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ x: "0px", y: "0px", scale: 0.8, opacity: 1 }}
                        animate={{
                          x: `${p.vx * 16}px`,
                          y: `${p.vy * 16}px`,
                          scale: [0.8, 1.4, 0],
                          opacity: [1, 0.9, 0],
                          rotate: 360,
                        }}
                        transition={{ duration: 0.85, ease: "easeOut" }}
                        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm z-50 pointer-events-none select-none"
                      >
                        {p.id % 3 === 0 ? "✨" : p.id % 3 === 1 ? "🌸" : "💖"}
                      </motion.div>
                    ))}

                    {/* 6. Lower help and author texts on the stripe background below the pocket card */}
                    <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center select-none">
                      <p className="font-serif italic text-[11px] text-[#8b7355]/90 text-center px-6 leading-relaxed">
                        {"(Cliquez sur n'importe quel élément ci-dessus pour l'explorer !)"}
                      </p>
                      
                      <p className="font-serif text-[12px] font-bold text-[#6a5438]/80 text-center mt-2.5">
                        {"Fait avec beaucoup d'amour 💖"}
                      </p>
                    </div>

                  </div>
                )}
              </motion.div>
            )}

            {/* 2. LETTER SCREEN */}
            {activeScreen === "letter" && (
              <motion.div
                key="letter-screen"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full flex flex-col justify-between px-5 pb-6 pt-4"
              >
                {/* Scrollable Letter Body */}
                <div className="relative flex-1 bg-white rounded-2xl shadow-md border-4 border-[#e8dfd3] p-5 pt-8 overflow-y-auto no-scrollbar flex flex-col justify-between">
                  {/* Elegant decorative corners */}
                  <div className="absolute top-2 left-2 text-xs text-rose-200">✿</div>
                  <div className="absolute top-2 right-2 text-xs text-rose-200">✿</div>
                  
                  {/* Handwritten Content */}
                  <div>
                    <h2 className="font-handwriting text-2xl font-bold text-rose-500 mb-4 select-none leading-none">
                      Chère {cardData.recipient},
                    </h2>
                    
                    {/* Preserve linebreaks for raw messages */}
                    <div className="font-casual text-lg text-neutral-700 leading-relaxed space-y-4 select-text whitespace-pre-wrap">
                      {cardData.message}
                    </div>
                  </div>

                  {/* Corner Teddy Bear and floral touch */}
                  <div className="flex justify-between items-end mt-8 border-t border-rose-50 border-dashed pt-4">
                    <div className="w-14 h-14 opacity-80 select-none">
                      <TeddyBearSvg />
                    </div>
                    <span className="text-xl text-rose-300">🌸</span>
                  </div>
                </div>

                {/* Back Button */}
                <button
                  onClick={() => setActiveScreen("envelope")}
                  className="mt-4 w-full py-3 bg-[#6a5438] text-white font-serif font-semibold text-sm tracking-widest rounded-xl shadow-md hover:bg-[#53412b] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  RETOUR
                </button>
              </motion.div>
            )}

            {/* 3. RETRO CASSETTE SCREEN */}
            {activeScreen === "cassette" && (
              <motion.div
                key="cassette-screen"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full flex flex-col justify-between px-5 pb-6 pt-4"
              >
                {/* Cassette stage area */}
                <div className="flex-1 flex flex-col items-center justify-center my-auto px-1">
                  <span className="text-rose-400 text-sm font-handwriting select-none">Votre chanson préférée !</span>
                  <h2 className="font-serif text-xl font-bold text-[#6a5438] text-center mt-1 select-none">
                    Retro Stereo Tape
                  </h2>

                  {/* The Vintage Cassette Player */}
                  <div className="w-full my-6 flex flex-col items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={toggleMusic}
                      className="relative w-full max-w-[280px] h-[180px] cursor-pointer"
                    >
                      <RetroCassetteSvg isSpinning={isPlayingMusic} title={cardData.cassetteTitle} />
                    </motion.div>

                    {/* Interactive music box play indicator & VU Meter */}
                    <div className="flex flex-col items-center gap-3.5 mt-4">
                      <LEDMeter isPlaying={isPlayingMusic} />

                      <button
                        onClick={toggleMusic}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-serif text-xs font-semibold tracking-wide shadow-sm transition-all cursor-pointer ${
                          isPlayingMusic
                            ? "bg-rose-500 text-white hover:bg-rose-600"
                            : "bg-white text-[#8b7355] border border-[#ebdcc8] hover:bg-rose-50/20"
                        }`}
                      >
                        {isPlayingMusic ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                            PAUSE LA MUSIQUE
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            JOUER LA MUSIQUE
                          </>
                        )}
                      </button>

                      <p className="text-[10px] text-neutral-400 italic text-center max-w-[200px] mt-1 select-none">
                        (Double-clique sur la cassette pour activer ou couper la mélodie rétro)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Back Button */}
                <button
                  onClick={() => setActiveScreen("envelope")}
                  className="mt-4 w-full py-3 bg-[#6a5438] text-white font-serif font-semibold text-sm tracking-widest rounded-xl shadow-md hover:bg-[#53412b] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  RETOUR
                </button>
              </motion.div>
            )}

            {/* 4. POLAROID GALLERY SCREEN */}
            {activeScreen === "polaroid" && (
              <motion.div
                key="polaroid-screen"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full flex flex-col justify-between px-5 pb-6 pt-4"
              >
                {/* Polaroid Stack Feed */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 py-2 px-1 rounded-2xl">
                  <div className="text-center mb-4 flex flex-col items-center gap-2">
                    <span className="text-xs font-serif italic text-neutral-400">(Fais défiler vers le bas pour voir toutes les photos ☕)</span>
                  </div>

                  {cardData.polaroids.map((p, idx) => {
                    // Generate subtle, attractive aesthetic angles for Polaroid placement
                    const angles = [-3.5, 2.5, -2, 3];
                    const angle = angles[idx % angles.length];

                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 30, rotate: 0 }}
                        animate={{ opacity: 1, y: 0, rotate: angle }}
                        whileHover={{ 
                          scale: 1.04, 
                          y: -4, 
                          rotate: angle * 0.5, 
                          zIndex: 30,
                          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                        }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 120, 
                          damping: 12,
                          delay: idx * 0.12
                        }}
                        className="relative bg-white p-3.5 pb-4 rounded-md shadow-md border border-neutral-100 flex flex-col max-w-[260px] mx-auto select-none group"
                      >
                        {/* Washi tape visual */}
                        <div className="absolute top-[-10px] left-1/2 transform -translate-x-1/2 w-14 h-4 bg-yellow-200/30 backdrop-blur-xs border border-dashed border-yellow-300/10 rotate-1 select-none pointer-events-none z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" />

                        {/* Polaroid Image Box */}
                        <div 
                          onClick={() => handlePhotoClick(p)}
                          className="relative aspect-square w-full bg-neutral-50 overflow-hidden border border-neutral-100 rounded-sm cursor-pointer"
                        >
                          <Image
                            src={p.image}
                            alt={p.caption}
                            fill
                            sizes="260px"
                            referrerPolicy="no-referrer"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          
                          {/* Beautiful lens/zoom overlay icon on hover */}
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="bg-white/95 text-[10px] text-[#503d2b] font-bold tracking-wider px-2 py-1 rounded-full shadow-sm flex items-center gap-1 scale-90 group-hover:scale-100 transition-transform duration-300 uppercase">
                              🔍 Agrandir
                            </span>
                          </div>
                        </div>

                        {/* Caption underneath image - Clean non-editable Text */}
                        <div className="text-center mt-3 px-1">
                          <p className="font-handwriting text-[#503d2b] text-base py-0.5 leading-snug select-none">
                            {p.caption || "Un souvenir précieux..."}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Back Button */}
                <button
                  onClick={() => setActiveScreen("envelope")}
                  className="mt-4 w-full py-3 bg-[#6a5438] text-white font-serif font-semibold text-sm tracking-widest rounded-xl shadow-md hover:bg-[#53412b] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  RETOUR
                </button>
              </motion.div>
            )}

            {/* 5. SURPRISE SCREEN */}
            {activeScreen === "surprise" && (
              <motion.div
                key="surprise-screen"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full flex flex-col justify-between px-5 pb-6 pt-4"
              >
                {/* Whimsical Surprise Display */}
                <div className="flex-1 flex flex-col items-center justify-center relative py-4">
                  
                  {/* Floating heart decorations */}
                  <motion.div
                    animate={{ y: [-10, -25, -10], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute top-2 left-10 text-rose-400 text-lg"
                  >
                    💖
                  </motion.div>
                  <motion.div
                    animate={{ y: [-20, -5, -20], opacity: [0.5, 0.9, 0.5] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                    className="absolute top-10 right-10 text-rose-300 text-xl"
                  >
                    💖
                  </motion.div>

                  {!isGiftBoxOpened ? (
                    /* UNOPENED STATE: Show the beautiful shaking tied Gift Box */
                    <div className="flex flex-col items-center">
                      <span className="text-rose-500 font-serif font-bold text-xs select-none tracking-widest uppercase mb-1">Un cadeau pour toi</span>
                      <h3 className="font-handwriting text-[#6a5438] text-lg mb-6 select-none text-center">Touche la boîte pour l&apos;ouvrir ! ✨</h3>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ 
                          rotate: [0, -3, 3, -3, 3, 0],
                          y: [0, -2, 0]
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 2.2,
                          ease: "easeInOut"
                        }}
                        onClick={() => {
                          // Play happy harp chime notes
                          setTimeout(() => playSynthNote("F4", 0.08), 0);
                          setTimeout(() => playSynthNote("A4", 0.08), 50);
                          setTimeout(() => playSynthNote("C5", 0.08), 100);
                          setTimeout(() => playSynthNote("F5", 0.18), 150);

                          // Trigger sparkle burst
                          const giftParticles = Array.from({ length: 16 }).map((_, i) => {
                            const angle = (i * 2 * Math.PI) / 16 + (Math.random() * 0.4 - 0.2);
                            const speed = Math.random() * 4 + 4;
                            return {
                              id: Date.now() + i,
                              x: 0,
                              y: 0,
                              vx: Math.cos(angle) * speed,
                              vy: Math.sin(angle) * speed,
                            };
                          });
                          setBurstParticles(giftParticles);
                          setTimeout(() => setBurstParticles([]), 950);

                          setIsGiftBoxOpened(true);
                        }}
                        className="w-48 h-48 flex items-center justify-center cursor-pointer select-none active:scale-95 transition-all"
                      >
                        <GiftBoxSvg />
                      </motion.button>
                    </div>
                  ) : (
                    /* OPENED STATE: Pop open the Cute Teddy bear holding a heart & message */
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 100, damping: 12 }}
                      className="flex flex-col items-center"
                    >
                      <span className="text-rose-500 font-serif font-bold text-sm select-none tracking-widest">SURPRISE !</span>

                      {/* Large Cute Teddy bear visual holding heart - Super high quality and bigger */}
                      <div className="relative w-56 h-56 mt-4 select-none">
                        <TeddyBearSvg holdsHeart={true} />
                        
                        {/* Pulsing visual glow background */}
                        <div className="absolute -inset-2 bg-rose-400 rounded-full blur-2xl opacity-15 -z-10 animate-pulse"></div>
                      </div>

                      {/* Speech Bubble */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.25, type: "spring", stiffness: 100 }}
                        className="relative bg-white border-2 border-[#8b7355]/40 rounded-2xl p-4 shadow-md max-w-[250px] mt-6"
                      >
                        {/* Speech bubble pointer */}
                        <div className="absolute top-[-9px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-t-2 border-l-2 border-[#8b7355]/40 rotate-45"></div>
                        
                        <p className="font-casual text-base font-bold text-neutral-700 text-center leading-relaxed">
                          {cardData.surpriseText}
                        </p>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Gold Dust / Seal Burst Particles inside surprise view */}
                  {burstParticles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ x: "0px", y: "0px", scale: 0.8, opacity: 1 }}
                      animate={{
                        x: `${p.vx * 16}px`,
                        y: `${p.vy * 16}px`,
                        scale: [0.8, 1.4, 0],
                        opacity: [1, 0.9, 0],
                        rotate: 360,
                      }}
                      transition={{ duration: 0.85, ease: "easeOut" }}
                      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm z-40 pointer-events-none select-none"
                    >
                      {p.id % 3 === 0 ? "✨" : p.id % 3 === 1 ? "🌸" : "💖"}
                    </motion.div>
                  ))}
                </div>

                {/* Back Button */}
                <button
                  onClick={() => {
                    setActiveScreen("envelope");
                    // Reset gift state so they can open it again for fun!
                    setTimeout(() => setIsGiftBoxOpened(false), 300);
                  }}
                  className="mt-4 w-full py-3 bg-[#6a5438] text-white font-serif font-semibold text-sm tracking-widest rounded-xl shadow-md hover:bg-[#53412b] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  RETOUR
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Small subtle footer credit to fit nicely */}
        <div className="w-full text-center py-2 bg-neutral-900 text-neutral-400 text-[10px] tracking-wide select-none">
          Créé avec amour • © {new Date().getFullYear()}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-4 flex items-center justify-center gap-3 z-30">
        <button
          onClick={() => setIsEditorOpen(true)}
          className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-full shadow-lg border border-rose-300 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Settings className="w-4 h-4 text-white" />
          <span>Personnaliser la carte ✏️</span>
        </button>
      </div>

      {/* 6. CARD CUSTOMIZER SIDEBAR DRAWER (Only shown when editor state active) */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex justify-end"
          >
            {/* Click outside to close drawer */}
            <div className="absolute inset-0" onClick={() => setIsEditorOpen(false)}></div>

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-[#fdfaf7]">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#6a5438] flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-rose-500" />
                    Personnaliser la Carte
                  </h3>
                  <p className="text-xs text-neutral-500">Personnalisez chaque texte, photo et chanson !</p>
                </div>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Form Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Field: Recipient */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">
                    Prénom de votre copine (Destinataire)
                  </label>
                  <input
                    type="text"
                    value={cardData.recipient}
                    onChange={(e) => setCardData({ ...cardData, recipient: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-rose-400 transition-all font-semibold"
                    placeholder="Ex: Alice"
                    maxLength={20}
                  />
                </div>

                {/* Visual Customization: Envelope Theme and Wax Seal Emblem */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-[#faf6f0] rounded-xl border border-[#e8dfd3]">
                  {/* Theme Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide block">
                      Couleur Enveloppe
                    </label>
                    <select
                      value={cardData.envelopeTheme || "classic"}
                      onChange={(e) => setCardData({ ...cardData, envelopeTheme: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-rose-400"
                    >
                      <option value="classic">Classique Kraft (Personnalisée)</option>
                    </select>
                  </div>

                  {/* Seal Emblem Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide block">
                      Emblème Sceau
                    </label>
                    <select
                      value={cardData.sealEmblem || "heart"}
                      onChange={(e) => setCardData({ ...cardData, sealEmblem: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-rose-400"
                    >
                      <option value="heart">❤️ Cœur (Personnalisé)</option>
                    </select>
                  </div>
                </div>

                {/* Gemini AI Writing Section */}
                <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100/60 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">
                      {"Rédiger avec l'IA Gemini"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    {"Vous n'avez pas d'inspiration ? Laissez Gemini composer une lettre d'amour sur mesure !"}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium focus:outline-none"
                    >
                      <option value="romantique">Doux & Romantique</option>
                      <option value="poétique">Poétique & Profond</option>
                      <option value="drôle">Mignon & Amusant</option>
                      <option value="court">Court & Épuré</option>
                    </select>

                    <button
                      onClick={handleGenerateAiLetter}
                      disabled={isGeneratingLetter || !cardData.recipient}
                      className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isGeneratingLetter ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Rédaction...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          Rédiger ✨
                        </>
                      )}
                    </button>
                  </div>

                  {/* Prompt memory keywords */}
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs placeholder:text-neutral-400 focus:outline-none focus:border-rose-300 h-16 resize-none"
                    placeholder="Écrivez des souvenirs/détails (ex: Notre voyage à Venise, elle aime les chats...)"
                  />
                  {aiError && <p className="text-[10px] text-red-500 font-semibold">{aiError}</p>}
                </div>

                {/* Field: Birthday Letter text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide flex justify-between">
                    <span>{"Texte de la lettre d'amour"}</span>
                    <span className="text-neutral-400 text-[10px] lowercase">{cardData.message.length} caract.</span>
                  </label>
                  <textarea
                    value={cardData.message}
                    onChange={(e) => setCardData({ ...cardData, message: e.target.value })}
                    rows={6}
                    className="w-full p-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-rose-400 font-casual text-base leading-relaxed"
                    placeholder="Saisissez votre lettre d'amour d'anniversaire ici..."
                    maxLength={1000}
                  />
                </div>

                {/* Field: Retro Cassette Song selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">
                    Sélectionner la Chanson rétro (Synthesizer)
                  </label>
                  <select
                    value={cardData.selectedSongId}
                    onChange={(e) => handleSongChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-rose-400 bg-white"
                  >
                    {SONGS.map((song) => (
                      <option key={song.id} value={song.id}>
                        {song.name}
                      </option>
                    ))}
                  </select>
                  {/* Cassette Title */}
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Titre sur la Cassette</span>
                    <input
                      type="text"
                      value={cardData.cassetteTitle}
                      onChange={(e) => setCardData({ ...cardData, cassetteTitle: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-rose-400"
                      placeholder="Ex: Notre Douce Mélodie ♫"
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Field: Polaroids */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-neutral-600 uppercase tracking-wide block border-b pb-1.5">
                    Photos Polaroid de la Galerie ({cardData.polaroids.length} photos)
                  </span>

                  {cardData.polaroids.map((p, index) => (
                    <div key={p.id} className="p-3 border border-neutral-100 rounded-xl bg-[#fafcfd] space-y-3 shadow-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-600">Photo Polaroid #{index + 1}</span>
                      </div>
                      
                      {/* Image Source Selection */}
                      <div className="flex gap-3 items-center">
                        {/* Thumbnail preview */}
                        <div className="relative w-16 h-16 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                          {p.image ? (
                            <img src={p.image} alt="thumbnail" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-neutral-300" />
                          )}
                        </div>

                        {/* Upload & URL Controls */}
                        <div className="flex-1 space-y-2">
                          <label className="cursor-pointer px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Changer la photo...</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageFileUpload(e, index)}
                            />
                          </label>

                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-neutral-400 block">{"Ou coller un lien d'image (URL) :"}</span>
                            <input
                              type="text"
                              value={p.image.startsWith("data:") ? "" : p.image}
                              onChange={(e) => {
                                const updated = [...cardData.polaroids];
                                updated[index].image = e.target.value;
                                setCardData({ ...cardData, polaroids: updated });
                              }}
                              className="w-full px-2 py-1 bg-white border border-neutral-200 rounded-md text-[11px] focus:outline-none focus:border-rose-300"
                              placeholder={p.image.startsWith("data:") ? "Photo personnalisée importée ✓" : "https://exemple.com/image.jpg"}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Image Caption input */}
                      <div>
                        <span className="text-[10px] font-medium text-neutral-400">Légende manuscrite</span>
                        <input
                          type="text"
                          value={p.caption}
                          onChange={(e) => {
                            const updated = [...cardData.polaroids];
                            updated[index].caption = e.target.value;
                            setCardData({ ...cardData, polaroids: updated });
                          }}
                          className="w-full mt-0.5 px-2 py-1.5 border border-neutral-200 rounded text-xs focus:outline-none focus:border-rose-300 font-casual"
                          placeholder="Saisissez une courte légende..."
                          maxLength={40}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Field: Teddy Surprise Speech */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">
                    Message de la Surprise (Bulle du Nounours)
                  </label>
                  <textarea
                    value={cardData.surpriseText}
                    onChange={(e) => setCardData({ ...cardData, surpriseText: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-rose-400 font-casual text-base"
                    placeholder="Message surprise du nounours..."
                    maxLength={150}
                  />
                </div>
              </div>

              {/* Drawer Footer Buttons */}
              <div className="p-4 border-t border-neutral-100 bg-[#fdfaf7] flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCardData(DEFAULT_CARD_DATA);
                      localStorage.removeItem("custom_card_data");
                      stopSequence();
                    }}
                    className="flex-1 py-2.5 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                  <button
                    onClick={handleGenerateShareLink}
                    className="flex-1 py-2.5 bg-rose-500 text-white text-xs font-bold rounded-xl hover:bg-rose-600 transition-colors flex items-center justify-center gap-1 shadow-md cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Générer le Lien 🔗
                  </button>
                </div>

                {/* Save directly to code button */}
                <button
                  onClick={handleSaveToProject}
                  disabled={isSavingProject}
                  className={`w-full py-3 px-4 font-sans font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    saveProjectStatus === "saving"
                      ? "bg-emerald-400 text-white cursor-wait"
                      : saveProjectStatus === "success"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : saveProjectStatus === "error"
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }`}
                >
                  {saveProjectStatus === "saving" ? (
                    <>
                      <span className="animate-spin mr-1">⌛</span>
                      Sauvegarde dans le projet en cours...
                    </>
                  ) : saveProjectStatus === "success" ? (
                    <>✓ Enregistré directement dans le projet !</>
                  ) : saveProjectStatus === "error" ? (
                    <>⚠ Échec : {saveProjectErrorMessage} (Réessayer)</>
                  ) : (
                    <>💾 Enregistrer de façon permanente dans le projet</>
                  )}
                </button>
                {saveProjectStatus === "success" && (
                  <p className="text-[10px] text-emerald-600 text-center font-semibold">
                    ✓ Les photos et modifications sont maintenant gravées par défaut dans le code de ton projet !
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. MAGIC SHARE LINK MODAL (CONFIRMATION DIALOG) */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative border border-rose-50"
            >
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-100 text-neutral-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center pt-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-100 rounded-full text-rose-500 mb-3 animate-bounce">
                  <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#6a5438]">{"Votre lien magique est prêt !"}</h3>
                <p className="text-xs text-neutral-500 mt-1 px-4">
                  {"Copiez le lien ci-dessous et envoyez-le à votre copine. Elle découvrira la carte interactive exactement comme vous l'avez configurée."}
                </p>
              </div>

              {/* Copy input container */}
              <div className="mt-5 flex items-center gap-1.5 p-1.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-transparent text-[11px] text-neutral-500 select-all focus:outline-none flex-1 pl-2 truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm transition-all ${
                    isCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-[#6a5438] text-white hover:bg-[#53412b]"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-6 py-2 bg-rose-50 text-rose-600 font-semibold text-xs rounded-full border border-rose-100 hover:bg-rose-100/50 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. INTERACTIVE POLAROID LIGHTBOX DIALOG */}
      <AnimatePresence>
        {selectedPolaroid && (
          <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, rotate: -4 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.9, opacity: 0, rotate: 4 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="relative bg-white p-5 pb-8 rounded-lg shadow-2xl border border-neutral-100 max-w-xs w-full flex flex-col items-center"
            >
              {/* Cute Washi Tape at the top */}
              <div className="absolute top-[-14px] left-1/2 transform -translate-x-1/2 w-20 h-5 bg-yellow-200/40 backdrop-blur-xs border border-dashed border-yellow-300/20 rotate-1 shadow-sm select-none pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedPolaroid(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Heavy border around full-view Image */}
              <div className="relative aspect-square w-full bg-neutral-50 overflow-hidden border border-neutral-200 rounded-xs shadow-inner">
                <Image
                  src={selectedPolaroid.image}
                  alt={selectedPolaroid.caption}
                  fill
                  sizes="320px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>

              {/* Hand-written text label */}
              <div className="text-center mt-5 px-1">
                <p className="font-handwriting text-[#503d2b] text-xl leading-relaxed select-none">
                  {selectedPolaroid.caption}
                </p>
                <p className="text-[10px] text-rose-400 font-medium tracking-wider uppercase mt-2 select-none">
                  💖 Souvenir Mémorable 💖
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic bottom footer outside the simulated phone */}
      <div className="mt-4 text-xs font-serif text-[#8b7355]/80 text-center select-none pb-2 z-10">
        Fait avec amour pour {cardData.recipient || "toi"} ❤️
      </div>
    </div>
  );
}

// ==========================================
// SUB-ASSETS AS BEAUTIFUL INLINE COMPONENT SVGS
// ==========================================

// Beautiful gold wax seal with intricate concentric circles and a custom emblem
function GoldWaxSealSvg({ emblem = "heart" }: { emblem?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full filter drop-shadow-md hover:brightness-110 active:scale-95 transition-all duration-200"
    >
      <defs>
        <radialGradient id="gold-grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="25%" stopColor="#e5a93b" />
          <stop offset="65%" stopColor="#b88314" />
          <stop offset="100%" stopColor="#875e03" />
        </radialGradient>
        <radialGradient id="gold-outer" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e5a93b" />
          <stop offset="80%" stopColor="#9e721b" />
          <stop offset="100%" stopColor="#66490c" />
        </radialGradient>
      </defs>
      
      {/* Irregular wax drippings outer shape */}
      <path
        d="M 50,4 C 62,3 74,7 81,15 90,25 96,39 94,54 92,68 85,82 74,89 62,97 45,98 32,94 18,89 8,76 5,61 2,46 7,30 17,19 28,8 39,5 50,4 Z"
        fill="url(#gold-outer)"
      />
      
      {/* Outer concentric inner ridge */}
      <circle cx="50" cy="50" r="38" fill="url(#gold-grad)" stroke="#66490c" strokeWidth="1" />
      
      {/* Inner wax pool with vintage detailing */}
      <circle cx="50" cy="50" r="28" fill="url(#gold-outer)" stroke="#fff3b0" strokeWidth="0.5" opacity="0.8" />
      
      {/* Intricate Custom Emblem in center */}
      {emblem === "heart" && (
        <path
          d="M 50,33 C 48,27 38,27 36,33 34,39 42,48 50,56 58,48 66,39 64,33 62,27 52,27 50,33 Z"
          fill="url(#gold-grad)"
          stroke="#66490c"
          strokeWidth="1.5"
        />
      )}
      {emblem === "star" && (
        <path
          d="M 50,23 L 56,36 L 70,38 L 60,48 L 63,62 L 50,55 L 37,62 L 40,48 L 30,38 L 44,36 Z"
          fill="url(#gold-grad)"
          stroke="#66490c"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
      {emblem === "rose" && (
        <path
          d="M 50,28 C 46,28 43,31 46,35 C 41,37 43,43 47,42 C 45,47 50,51 53,48 C 56,51 61,47 59,42 C 63,43 65,37 60,35 C 63,31 60,28 56,28 C 53,26 51,26 50,28 Z M 50,48 L 50,64"
          fill="none"
          stroke="#66490c"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      {emblem === "crown" && (
        <path
          d="M 32,58 L 35,36 L 43,45 L 50,32 L 57,45 L 65,36 L 68,58 Z M 32,58 L 68,58"
          fill="url(#gold-grad)"
          stroke="#66490c"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      
      {/* Fine wax luster sparkle */}
      <circle cx="34" cy="34" r="3" fill="#fff" opacity="0.3" />
    </svg>
  );
}

// ==========================================
// THEME CONFIGURATION FOR ENVELOPES
// ==========================================
const ENVELOPE_THEMES: Record<string, {
  name: string;
  bg: string;
  inside: string;
  left: string;
  right: string;
  bottom: string;
  backFlap: string;
  border: string;
  goldFoil: string;
  text: string;
  shadow: string;
}> = {
  classic: {
    name: "Cozy Kraft (Caramel)",
    bg: "bg-gradient-to-b from-[#c4a687] to-[#b59273]",
    inside: "bg-[#8c6d4f]",
    left: "bg-gradient-to-r from-[#a3805f] to-[#b59273]",
    right: "bg-gradient-to-l from-[#a3805f] to-[#b59273]",
    bottom: "bg-gradient-to-t from-[#8c694a] to-[#a3805f]",
    backFlap: "bg-[#9c7b5a]",
    border: "border-[#8c6d4f]/30",
    goldFoil: "rgba(229, 169, 59, 0.4)",
    text: "text-[#6a5438]",
    shadow: "shadow-[inset_0_4px_12px_rgba(0,0,0,0.15)]",
  },
};

// ==========================================
// RETRO LED LEVEL VU METER COMPONENT
// ==========================================
function LEDMeter({ isPlaying }: { isPlaying: boolean }) {
  const bars = Array.from({ length: 8 });
  return (
    <div className="flex items-center gap-1 bg-black/90 px-3 py-1.5 rounded-lg border border-[#a38260]/40 shadow-inner h-9 select-none">
      <span className="text-[7px] font-mono font-bold text-amber-500 mr-1 uppercase tracking-tight">VU LEVEL</span>
      <div className="flex items-end gap-0.5 h-4">
        {bars.map((_, i) => (
          <div key={i} className="flex flex-col gap-0.5 h-full justify-end">
            {Array.from({ length: 4 }).map((_, segmentIdx) => {
              const segVal = 3 - segmentIdx; // 3 to 0
              let segColor = "bg-neutral-800";
              if (isPlaying) {
                if (segVal === 0) segColor = "bg-emerald-400 shadow-[0_0_2px_#34d399]";
                else if (segVal === 1) segColor = "bg-emerald-400 shadow-[0_0_2px_#34d399]";
                else if (segVal === 2) segColor = "bg-orange-400 shadow-[0_0_2px_#fb923c]";
                else segColor = "bg-rose-500 shadow-[0_0_2px_#f43f5e]";
              } else {
                if (segVal === 0) segColor = "bg-emerald-950";
                else if (segVal === 1) segColor = "bg-emerald-950";
                else if (segVal === 2) segColor = "bg-orange-950";
                else segColor = "bg-rose-950";
              }
              
              return (
                <motion.div
                  key={segmentIdx}
                  animate={isPlaying ? {
                    opacity: [0.3, 1, 0.3],
                  } : { opacity: 1 }}
                  transition={{
                    duration: 0.2 + (i * 0.05),
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                  className={`w-1.5 h-0.5 rounded-sm ${segColor}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <span className="text-[7px] font-mono text-emerald-400 ml-1.5 animate-pulse">{isPlaying ? "ON" : "OFF"}</span>
    </div>
  );
}

// ==========================================
// GORGEOUS EXQUISITE GIFT BOX SVG
// ==========================================
function GiftBoxSvg() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-md">
      <defs>
        <linearGradient id="box-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="60%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="ribbon-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>
      
      {/* Box base */}
      <rect x="20" y="45" width="60" height="45" rx="4" fill="url(#box-grad)" stroke="#9f1239" strokeWidth="1" />
      
      {/* Lid */}
      <rect x="16" y="34" width="68" height="12" rx="3" fill="url(#box-grad)" stroke="#9f1239" strokeWidth="1" />
      
      {/* Vertical Ribbon */}
      <rect x="44" y="45" width="12" height="45" fill="url(#ribbon-grad)" stroke="#ca8a04" strokeWidth="0.5" />
      <rect x="44" y="34" width="12" height="12" fill="url(#ribbon-grad)" stroke="#ca8a04" strokeWidth="0.5" />
      
      {/* Horizontal Ribbon on base */}
      <rect x="20" y="60" width="60" height="8" fill="url(#ribbon-grad)" stroke="#ca8a04" strokeWidth="0.5" />

      {/* Bow left loop */}
      <path d="M 50,34 C 42,20 28,24 40,34 Z" fill="url(#ribbon-grad)" stroke="#ca8a04" strokeWidth="1" />
      {/* Bow right loop */}
      <path d="M 50,34 C 58,20 72,24 60,34 Z" fill="url(#ribbon-grad)" stroke="#ca8a04" strokeWidth="1" />

      {/* Center knot */}
      <circle cx="50" cy="34" r="6" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
      
      {/* Gold dots detailing */}
      <circle cx="28" cy="53" r="2" fill="#fef08a" opacity="0.8" />
      <circle cx="72" cy="53" r="2" fill="#fef08a" opacity="0.8" />
      <circle cx="28" cy="78" r="2" fill="#fef08a" opacity="0.8" />
      <circle cx="72" cy="78" r="2" fill="#fef08a" opacity="0.8" />
    </svg>
  );
}

// ==========================================
// COZY TABLE ORNAMENTS FLATLAY
// ==========================================
function CoffeeCup() {
  return (
    <div className="absolute top-[12%] right-[8%] w-24 h-24 rotate-[15deg] hidden lg:flex flex-col items-center justify-center pointer-events-none select-none z-10">
      <div className="absolute w-22 h-22 bg-[#8c6d4f]/20 rounded-full blur-sm translate-x-2 translate-y-3"></div>
      <div className="absolute w-22 h-22 bg-[#faf6f0] rounded-full border border-neutral-200 flex items-center justify-center shadow-md">
        <div className="w-16 h-16 rounded-full border border-neutral-100 flex items-center justify-center">
          <div className="w-13 h-13 rounded-full bg-white border border-neutral-300 shadow-inner flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#3b2314] to-[#5a3825] flex items-center justify-center overflow-hidden">
              <div className="w-5 h-5 bg-[#f5ebd5] rounded-full relative transform rotate-45 scale-75 opacity-90">
                <div className="absolute -top-2 left-0 w-5 h-5 bg-[#f5ebd5] rounded-full"></div>
                <div className="absolute top-0 -left-2 w-5 h-5 bg-[#f5ebd5] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute right-[-2px] top-[30%] w-5 h-8 bg-white border border-neutral-300 rounded-r-xl transform rotate-12 shadow-sm -z-10"></div>
      <div className="absolute top-[-10px] flex gap-1 justify-center w-full">
        {[1, 2, 3].map((s) => (
          <motion.div
            key={s}
            animate={{
              y: [10, -20],
              opacity: [0, 0.4, 0],
              x: [0, s % 2 === 0 ? 4 : -4, 0],
            }}
            transition={{
              duration: 2 + s,
              repeat: Infinity,
              delay: s * 0.7,
              ease: "easeInOut",
            }}
            className="w-[1.5px] h-6 bg-amber-100/40 rounded-full blur-[0.5px]"
          />
        ))}
      </div>
    </div>
  );
}

function TablePolaroid() {
  return (
    <div className="absolute bottom-[12%] left-[8%] w-32 bg-white p-2.5 pb-4 shadow-xl border border-neutral-100 rounded-sm transform -rotate-[12deg] hidden lg:block select-none pointer-events-none z-10">
      <div className="w-full aspect-square bg-[#faeed6] overflow-hidden relative">
        <Image
          src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=200&auto=format&fit=crop"
          alt="love"
          fill
          sizes="120px"
          referrerPolicy="no-referrer"
          className="object-cover filter brightness-[1.02] sepia-[0.1]"
        />
        <span className="absolute bottom-1 right-1 text-xs opacity-75 z-10">💖</span>
      </div>
      <div className="absolute top-[-12px] left-1/2 transform -translate-x-1/2 w-12 h-5 bg-yellow-200/40 backdrop-blur-xs border-dashed border border-yellow-300/20 -rotate-3"></div>
      <p className="font-handwriting text-neutral-700 text-[10px] text-center mt-2 font-bold leading-none">To Alice ✿</p>
    </div>
  );
}

function LoveNotebook() {
  return (
    <div className="absolute top-[22%] left-[6%] w-48 bg-[#fffdfa] p-5 shadow-lg border border-[#e8dfd3] rounded-xl transform -rotate-[6deg] hidden xl:block select-none pointer-events-none z-10">
      <div className="space-y-3">
        <div className="border-b border-rose-100 pb-1 flex justify-between items-center">
          <span className="font-serif text-[9px] text-rose-300 font-bold tracking-widest">MEMORIES</span>
          <span className="text-[9px] text-neutral-300">✿ 08/01</span>
        </div>
        <p className="font-handwriting text-[#503d2b] text-[13px] leading-relaxed mt-2 italic font-semibold">
          {"\"Tu es ma plus belle histoire d'amour. Chaque seconde à tes côtés est un cadeau précieux.\""}
        </p>
        <div className="w-full h-[1px] bg-neutral-100"></div>
        <div className="flex justify-end pt-1">
          <span className="text-rose-400 text-xs">🧸❤️</span>
        </div>
      </div>
    </div>
  );
}

function VintageCamera() {
  return (
    <div className="absolute bottom-[16%] right-[8%] w-28 h-20 bg-neutral-800 rounded-lg shadow-xl border-t-4 border-neutral-700 hidden lg:block select-none pointer-events-none transform rotate-[8deg] z-10">
      <div className="absolute top-0 inset-x-0 h-4 bg-neutral-300 rounded-t-sm flex justify-between px-2 items-center">
        <div className="w-4 h-1.5 bg-neutral-400 rounded-xs"></div>
        <div className="w-3 h-3 bg-neutral-500 rounded-full border border-neutral-600"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/3 w-12 h-12 bg-neutral-700 rounded-full border-4 border-neutral-300 flex items-center justify-center">
        <div className="w-8 h-8 bg-neutral-900 rounded-full border-2 border-neutral-800 flex items-center justify-center">
          <div className="w-3 h-3 bg-sky-300 rounded-full opacity-30 absolute top-2 right-2"></div>
        </div>
      </div>
      <div className="absolute top-6 left-3 w-2 h-2 bg-rose-500 rounded-full"></div>
    </div>
  );
}

function TableDecorations() {
  return (
    <>
      <CoffeeCup />
      <TablePolaroid />
      <LoveNotebook />
      <VintageCamera />
    </>
  );
}

// Gorgeous Watercolor-style Cute Teddy Bear
interface BearProps {
  holdsHeart?: boolean;
}

function TeddyBearSvg({ holdsHeart = false }: BearProps) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        {/* Soft fur textures */}
        <radialGradient id="fur-main" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e5c5a0" />
          <stop offset="85%" stopColor="#cc9e6a" />
          <stop offset="100%" stopColor="#b28453" />
        </radialGradient>
        <radialGradient id="fur-inner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f7ebd9" />
          <stop offset="100%" stopColor="#e5c5a0" />
        </radialGradient>
        <radialGradient id="cheek-pink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffa6b9" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffa6b9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ear-inner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffccd5" />
          <stop offset="80%" stopColor="#f7ebd9" />
          <stop offset="100%" stopColor="#e5c5a0" />
        </radialGradient>
        <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff7b93" />
          <stop offset="40%" stopColor="#ff4b6b" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>

      {/* Ears */}
      {/* Left Ear */}
      <circle cx="28" cy="28" r="12" fill="url(#fur-main)" />
      <circle cx="28" cy="28" r="7" fill="url(#ear-inner)" />
      {/* Right Ear */}
      <circle cx="72" cy="28" r="12" fill="url(#fur-main)" />
      <circle cx="72" cy="28" r="7" fill="url(#ear-inner)" />

      {/* Arms (Back layer if holding heart) */}
      {!holdsHeart && (
        <>
          {/* Left Arm resting */}
          <ellipse cx="20" cy="58" rx="8" ry="12" fill="url(#fur-main)" transform="rotate(30, 20, 58)" />
          {/* Right Arm waving */}
          <ellipse cx="80" cy="58" rx="8" ry="12" fill="url(#fur-main)" transform="rotate(-30, 80, 58)" />
        </>
      )}

      {/* Feet / Paws */}
      <ellipse cx="32" cy="85" rx="11" ry="9" fill="url(#fur-main)" />
      <ellipse cx="32" cy="85" rx="7" ry="5" fill="url(#ear-inner)" />
      
      <ellipse cx="68" cy="85" rx="11" ry="9" fill="url(#fur-main)" />
      <ellipse cx="68" cy="85" rx="7" ry="5" fill="url(#ear-inner)" />

      {/* Body */}
      <circle cx="50" cy="68" r="22" fill="url(#fur-main)" />
      <ellipse cx="50" cy="70" rx="13" ry="15" fill="url(#fur-inner)" opacity="0.9" />

      {/* Head */}
      <circle cx="50" cy="46" r="23" fill="url(#fur-main)" />

      {/* Cute Cheeks with shine */}
      <circle cx="34" cy="50" r="6" fill="url(#cheek-pink)" />
      <circle cx="33" cy="49" r="1.2" fill="#fff" opacity="0.8" />
      <circle cx="66" cy="50" r="6" fill="url(#cheek-pink)" />
      <circle cx="65" cy="49" r="1.2" fill="#fff" opacity="0.8" />

      {/* Snout / Muzzle */}
      <ellipse cx="50" cy="51" rx="8" ry="6" fill="url(#fur-inner)" />

      {/* Eyes with high fidelity reflections */}
      <circle cx="40" cy="43" r="2.8" fill="#291e14" />
      <circle cx="39" cy="41.8" r="0.9" fill="#fff" />
      <circle cx="41.2" cy="44.2" r="0.4" fill="#fff" />
      
      <circle cx="60" cy="43" r="2.8" fill="#291e14" />
      <circle cx="59" cy="41.8" r="0.9" fill="#fff" />
      <circle cx="61.2" cy="44.2" r="0.4" fill="#fff" />

      {/* Nose with shine */}
      <ellipse cx="50" cy="48" rx="3" ry="2" fill="#291e14" />
      <circle cx="49.5" cy="47.2" r="0.6" fill="#fff" opacity="0.9" />

      {/* Mouth */}
      <path d="M 46.5,51 Q 48.5,53.5 50,51 Q 51.5,53.5 53.5,51" fill="none" stroke="#291e14" strokeWidth="1.2" strokeLinecap="round" />

      {/* Cute Flower decoration near Left Ear */}
      {!holdsHeart && (
        <g transform="translate(24, 20)">
          {/* Petals */}
          <circle cx="-4" cy="0" r="3.5" fill="#fff" opacity="0.95" />
          <circle cx="4" cy="0" r="3.5" fill="#fff" opacity="0.95" />
          <circle cx="0" cy="-4" r="3.5" fill="#fff" opacity="0.95" />
          <circle cx="0" cy="4" r="3.5" fill="#fff" opacity="0.95" />
          {/* Flower Center */}
          <circle cx="0" cy="0" r="2.5" fill="#facc15" />
        </g>
      )}

      {/* Surprise accessory: Big red heart held in front */}
      {holdsHeart && (
        <g className="animate-pulse">
          {/* Heart */}
          <path
            d="M 50,75 C 50,75 28,58 28,46 C 28,38 38,36 42,42 C 44,44 50,51 50,51 C 50,51 56,44 58,42 C 62,36 72,38 72,46 C 72,58 50,75 50,75 Z"
            fill="url(#heart-grad)"
            stroke="#e11d48"
            strokeWidth="1.5"
          />
          {/* Heart sparkle luster */}
          <path d="M 36,44 Q 34,48 36,52" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
          <circle cx="42" cy="40" r="1.5" fill="#fff" opacity="0.9" />
          
          {/* Bear's Paws holding the heart from sides */}
          <circle cx="31" cy="52" r="6" fill="url(#fur-main)" stroke="#a1723c" strokeWidth="0.5" />
          <circle cx="69" cy="52" r="6" fill="url(#fur-main)" stroke="#a1723c" strokeWidth="0.5" />
        </g>
      )}

      {/* Ribbon bow neck tie */}
      {!holdsHeart && (
        <g transform="translate(50, 62) scale(0.75)">
          {/* Beautiful Rose Bow Tie */}
          <path d="M -12,-6 C -18,-14 -6,-16 -2,-8 L 0,0 L -12,-6 Z" fill="#f43f5e" stroke="#be123c" strokeWidth="0.75" />
          <path d="M 12,-6 C 18,-14 6,-16 2,-8 L 0,0 L 12,-6 Z" fill="#f43f5e" stroke="#be123c" strokeWidth="0.75" />
          {/* Bow ribbons hanging down */}
          <path d="M -2,0 L -8,12 L -2,8 Z" fill="#db2777" />
          <path d="M 2,0 L 8,12 L 2,8 Z" fill="#db2777" />
          {/* Bow knot */}
          <circle cx="0" cy="-4" r="3.5" fill="#facc15" stroke="#be123c" strokeWidth="0.5" />
        </g>
      )}
    </svg>
  );
}

// Gorgeous High-Fidelity Retro Cassette Player with Spinning Reels
interface CassetteProps {
  isSpinning: boolean;
  title: string;
}

function RetroCassetteSvg({ isSpinning, title }: CassetteProps) {
  return (
    <svg viewBox="0 0 300 200" className="w-full h-full filter drop-shadow-md">
      <defs>
        {/* Gradients */}
        <linearGradient id="cassette-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ece5d8" />
          <stop offset="40%" stopColor="#decbb3" />
          <stop offset="100%" stopColor="#bfab93" />
        </linearGradient>
        <linearGradient id="cassette-dark-accent" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8c6d4f" />
          <stop offset="100%" stopColor="#664d35" />
        </linearGradient>
      </defs>

      {/* Outer plastic chassis */}
      <rect x="10" y="10" width="280" height="180" rx="16" fill="url(#cassette-body)" stroke="#664d35" strokeWidth="3" />
      
      {/* Decorative inner groove border */}
      <rect x="18" y="18" width="264" height="164" rx="12" fill="none" stroke="#a38260" strokeWidth="1" opacity="0.5" />

      {/* Cassette Label (Beige paper) */}
      <rect x="35" y="32" width="230" height="110" rx="8" fill="#fff" stroke="#decbb3" strokeWidth="1.5" />
      
      {/* Red & Blue vintage stripes on label */}
      <rect x="42" y="40" width="216" height="4" fill="#f43f5e" rx="1" />
      <rect x="42" y="48" width="216" height="3" fill="#3b82f6" rx="1" />

      {/* Handwritten Text on Label */}
      <text
        x="150"
        y="72"
        textAnchor="middle"
        className="font-handwriting text-neutral-800 text-lg font-bold select-none fill-neutral-800"
      >
        {title}
      </text>

      {/* Center Transparent Cassette Window */}
      <rect x="75" y="85" width="150" height="48" rx="6" fill="#1c1917" stroke="#decbb3" strokeWidth="1.5" />

      {/* Reel Spindle holes */}
      {/* Left Reel Wheel */}
      <g transform="translate(112, 109)">
        {/* Outer wheel */}
        <circle cx="0" cy="0" r="18" fill="#292524" stroke="#bfab93" strokeWidth="1.5" />
        {/* Spinning inner spokes */}
        <motion.g
          animate={isSpinning ? { rotate: 360 } : {}}
          transition={isSpinning ? { repeat: Infinity, duration: 4, ease: "linear" } : {}}
          style={{ transformOrigin: "0px 0px" }}
        >
          {/* Wheel teeth */}
          <circle cx="0" cy="0" r="11" fill="none" stroke="#decbb3" strokeWidth="3" strokeDasharray="3 3" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#bfab93" strokeWidth="1.5" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#bfab93" strokeWidth="1.5" />
        </motion.g>
        {/* Center hole */}
        <circle cx="0" cy="0" r="6" fill="#1c1917" />
      </g>

      {/* Right Reel Wheel */}
      <g transform="translate(188, 109)">
        {/* Outer wheel */}
        <circle cx="0" cy="0" r="18" fill="#292524" stroke="#bfab93" strokeWidth="1.5" />
        {/* Spinning inner spokes */}
        <motion.g
          animate={isSpinning ? { rotate: 360 } : {}}
          transition={isSpinning ? { repeat: Infinity, duration: 4, ease: "linear" } : {}}
          style={{ transformOrigin: "0px 0px" }}
        >
          {/* Wheel teeth */}
          <circle cx="0" cy="0" r="11" fill="none" stroke="#decbb3" strokeWidth="3" strokeDasharray="3 3" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#bfab93" strokeWidth="1.5" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#bfab93" strokeWidth="1.5" />
        </motion.g>
        {/* Center hole */}
        <circle cx="0" cy="0" r="6" fill="#1c1917" />
      </g>

      {/* Magnetic tape visible inside the window (trapezoid outline) */}
      <polygon points="120,133 180,133 168,125 132,125" fill="#3a2f28" opacity="0.6" />

      {/* Vintage quality and index markers */}
      <text x="50" y="115" className="text-[7px] font-mono tracking-widest font-bold fill-neutral-400 select-none">A INDEX</text>
      <text x="226" y="115" className="text-[7px] font-mono tracking-widest font-bold fill-neutral-400 select-none">STEREO</text>
      
      {/* Plastic detailing circles in corners */}
      <circle cx="22" cy="22" r="3" fill="#a38260" opacity="0.3" />
      <circle cx="278" cy="22" r="3" fill="#a38260" opacity="0.3" />
      <circle cx="22" cy="178" r="3" fill="#a38260" opacity="0.3" />
      <circle cx="278" cy="178" r="3" fill="#a38260" opacity="0.3" />
    </svg>
  );
}

// ==========================================
// BACKGROUND DRIFTING PARTICLES COMPONENT
// ==========================================
function FloatingParticles() {
  const [mounted, setMounted] = useState(false);
  const [particles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number; type: string }[]>(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      // Deterministic pseudo-random generation to prevent hydration mismatches
      const xVal = ((Math.sin(i * 3.7 + 1.2) + 1) / 2) * 100;
      const sizeVal = 10 + (i % 8) * 2;
      const delayVal = (i % 5) * -3.5;
      const durationVal = 16 + (i % 4) * 4.5;
      return {
        id: i,
        x: xVal,
        y: 150,
        size: sizeVal,
        delay: delayVal,
        duration: durationVal,
        type: ["heart", "petal", "sparkle"][i % 3],
      };
    });
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {particles.map((p) => {
        let content = "🌸";
        if (p.type === "heart") content = "❤️";
        if (p.type === "sparkle") content = "✨";

        return (
          <motion.div
            key={p.id}
            initial={{ y: "110vh", x: `${p.x}vw`, scale: 0.5, opacity: 0, rotate: 0 }}
            animate={{
              y: "-10vh",
              x: [
                `${p.x}vw`,
                `${p.x + (Math.sin(p.id) * 6)}vw`,
                `${p.x - (Math.sin(p.id) * 3)}vw`,
                `${p.x + (Math.sin(p.id) * 5)}vw`
              ],
              scale: [0.6, 1.1, 0.9, 0.6],
              opacity: [0, 0.7, 0.8, 0.4, 0],
              rotate: [0, p.id % 2 === 0 ? 180 : -180, p.id % 2 === 0 ? 360 : -360],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              fontSize: `${p.size}px`,
              filter: p.type === "sparkle" ? "drop-shadow(0 0 4px rgba(253, 224, 71, 0.6))" : "none",
            }}
          >
            {content}
          </motion.div>
        );
      })}
    </div>
  );
}


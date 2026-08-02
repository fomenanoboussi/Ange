"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f4ec] text-[#8b7355] px-4 text-center">
      <h1 className="text-4xl font-serif font-bold mb-4">Une erreur est survenue</h1>
      <p className="text-lg mb-8 max-w-md font-sans italic">
        {"Une douce brise a fait vaciller la carte. Veuillez essayer de rafraîchir ou de réinitialiser la page."}
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition duration-300 shadow-md font-sans cursor-pointer"
      >
        Réessayer
      </button>
    </div>
  );
}

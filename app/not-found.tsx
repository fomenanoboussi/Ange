import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f4ec] text-[#8b7355] px-4 text-center">
      <h1 className="text-4xl font-serif font-bold mb-4">Page non trouvée</h1>
      <p className="text-lg mb-8 max-w-md font-sans italic">
        {"Désolé, nous n'avons pas pu trouver la page magique que vous cherchez."}
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition duration-300 shadow-md font-sans"
      >
        {"Retour à l'accueil"}
      </Link>
    </div>
  );
}

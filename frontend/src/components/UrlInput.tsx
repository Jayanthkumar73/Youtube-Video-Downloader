"use client";

import { useState } from "react";

interface UrlInputProps {
  onFetchMetadata: (url: string) => void;
  isLoading: boolean;
}

export default function UrlInput({ onFetchMetadata, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const ytRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytRegex.test(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    setError("");
    onFetchMetadata(url);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <form onSubmit={handleSubmit} className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Paste YouTube URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 px-6 py-4 rounded-xl text-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] backdrop-blur-md"
        />
        <button
          type="submit"
          disabled={isLoading || !url}
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold text-lg hover:from-purple-500 hover:to-blue-400 transition-all focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.5)]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Analyze"
          )}
        </button>
      </form>
      {error && <p className="mt-2 text-red-400 text-sm font-medium animate-pulse">{error}</p>}
    </div>
  );
}

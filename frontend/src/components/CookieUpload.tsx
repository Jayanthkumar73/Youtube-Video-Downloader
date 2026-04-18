"use client";

import { useState, useEffect, useRef } from "react";

export default function CookieUpload() {
  const [cookiesLoaded, setCookiesLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    checkCookiesStatus();
  }, []);

  const checkCookiesStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/cookies/status`);
      const data = await res.json();
      setCookiesLoaded(data.cookies_loaded);
    } catch {
      // Backend might not be running yet
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${backendUrl}/cookies`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setCookiesLoaded(true);
        setMessage("Cookies uploaded! Downloads should work now.");
      } else {
        setMessage(data.detail || "Upload failed.");
      }
    } catch {
      setMessage("Failed to connect to server.");
    } finally {
      setIsUploading(false);
      // Reset the file input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCookies = async () => {
    try {
      await fetch(`${backendUrl}/cookies`, { method: "DELETE" });
      setCookiesLoaded(false);
      setMessage("Cookies removed.");
    } catch {
      setMessage("Failed to remove cookies.");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-1">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              cookiesLoaded ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"
            }`}
          />
          <span className="text-sm text-white/70">
            {cookiesLoaded ? "Cookies loaded — YouTube auth active" : "No cookies — 403 errors likely on download"}
          </span>
        </div>

        {cookiesLoaded ? (
          <button
            onClick={handleRemoveCookies}
            className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-medium"
          >
            Remove
          </button>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-all font-medium disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload cookies.txt"}
            </button>
          </>
        )}
      </div>

      {message && (
        <p
          className={`mt-2 text-xs font-medium ${
            message.includes("Failed") || message.includes("failed")
              ? "text-red-400"
              : "text-green-400"
          }`}
        >
          {message}
        </p>
      )}

      {!cookiesLoaded && (
        <p className="mt-2 text-xs text-white/40 leading-relaxed">
          Getting 403 errors? Export your YouTube cookies using a browser extension like
          &quot;Get cookies.txt LOCALLY&quot;, then upload the file here.
        </p>
      )}
    </div>
  );
}

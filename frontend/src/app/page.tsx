"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import FormatTable from "@/components/FormatTable";
import CookieUpload from "@/components/CookieUpload";
import Image from "next/image";

interface Metadata {
  title: string;
  thumbnail: string;
  duration: number;
  formats: any[];
}

export default function Home() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [downloadingFormatId, setDownloadingFormatId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleFetchMetadata = async (url: string) => {
    setIsLoadingMetadata(true);
    setErrorMsg("");
    setMetadata(null);
    setCurrentUrl(url);
    try {
      const res = await fetch(`${backendUrl}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to fetch metadata");
      const data = await res.json();
      setMetadata(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred fetching metadata.");
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleDownload = async (formatId: string, vcodec: string, acodec: string) => {
    setDownloadingFormatId(formatId);
    setErrorMsg("");
    try {
      const res = await fetch(`${backendUrl}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl, format_id: formatId, vcodec, acodec })
      });
      
      if (!res.ok) throw new Error(await res.text() || "Failed to download");
      
      const blob = await res.blob();
      const donwloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = donwloadUrl;
      // Get filename from header if possible, else fallback
      const disposition = res.headers.get('content-disposition');
      let filename = `${metadata?.title || 'video'}.mp4`;
      if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) { 
            filename = matches[1].replace(/['"]/g, '');
          }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();    
      a.remove();
      window.URL.revokeObjectURL(donwloadUrl);

    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred starting download.");
    } finally {
      setDownloadingFormatId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 inset-x-0 h-screen w-full -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/40 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-blue-900/30 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-24 flex flex-col items-center">
        <div className="text-center space-y-6 max-w-3xl">
          <h1 className="text-6xl font-black tracking-tight flex flex-col gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
              YouTube
            </span>
            <span>Video Extractor</span>
          </h1>
          <p className="text-xl text-white/60 font-medium">
            High-performance architecture to download any YouTube video in its original, pristine quality.
          </p>
        </div>

        <UrlInput onFetchMetadata={handleFetchMetadata} isLoading={isLoadingMetadata} />
        <CookieUpload />

        {errorMsg && (
          <div className="mt-8 px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 max-w-2xl w-full text-center font-medium">
            {errorMsg}
          </div>
        )}

        {metadata && (
          <div className="mt-16 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
              {metadata.thumbnail && (
                <div className="relative w-full md:w-1/3 aspect-video rounded-xl overflow-hidden shadow-xl border border-white/10">
                  <Image 
                    src={metadata.thumbnail} 
                    alt={metadata.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-bold text-white line-clamp-2">{metadata.title}</h2>
                <div className="flex gap-4">
                   <span className="px-3 py-1 rounded-full bg-white/10 text-sm font-semibold tracking-wider text-white/80">
                      {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')}
                   </span>
                </div>
              </div>
            </div>

            <FormatTable 
              formats={metadata.formats} 
              onDownload={handleDownload}
              isDownloadingUrl={downloadingFormatId}
            />
          </div>
        )}
      </div>
    </main>
  );
}

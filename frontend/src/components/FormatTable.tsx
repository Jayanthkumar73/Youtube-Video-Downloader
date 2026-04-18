"use client";

interface Format {
  format_id: string;
  ext: string;
  resolution: string;
  filesize: number | null;
  filesize_approx: number | null;
  vcodec: string;
  acodec: string;
  format_note: string;
  tbr: number | null;
}

interface FormatTableProps {
  formats: Format[];
  onDownload: (formatId: string, vcodec: string, acodec: string) => void;
  isDownloadingUrl: string | null;
}

export default function FormatTable({ formats, onDownload, isDownloadingUrl }: FormatTableProps) {
  const formatSize = (bytes: number | null, approx: number | null) => {
    const size = bytes || approx;
    if (!size) return "Unknown size";
    const mb = size / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // Only show video formats, sort by resolution descending
  const videoFormats = formats
    .filter(f => f.vcodec !== 'none')
    .sort((a, b) => {
      const resA = parseInt(a.resolution.split('x')[1] || a.resolution.replace('p', '')) || 0;
      const resB = parseInt(b.resolution.split('x')[1] || b.resolution.replace('p', '')) || 0;
      return resB - resA;
    });

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      <table className="w-full text-left text-white">
        <thead className="bg-white/10 text-sm uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4 font-semibold">Resolution</th>
            <th className="px-6 py-4 font-semibold">Format</th>
            <th className="px-6 py-4 font-semibold">Size</th>
            <th className="px-6 py-4 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {videoFormats.map((format, idx) => (
            <tr key={`${format.format_id}-${idx}`} className="hover:bg-white/5 transition-colors">
              <td className="px-6 py-4 font-medium">
                {format.format_note ? `${format.resolution} (${format.format_note})` : format.resolution}
              </td>
              <td className="px-6 py-4 text-white/70 uppercase">
                {format.ext}
              </td>
              <td className="px-6 py-4 text-white/70">
                {formatSize(format.filesize, format.filesize_approx)}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onDownload(format.format_id, format.vcodec, format.acodec)}
                  disabled={isDownloadingUrl === format.format_id}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-purple-600 border border-white/20 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ml-auto min-w-[120px]"
                >
                  {isDownloadingUrl === format.format_id ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading
                    </>
                  ) : (
                    "Download"
                  )}
                </button>
              </td>
            </tr>
          ))}
          {videoFormats.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-white/50">
                No reliable video formats found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

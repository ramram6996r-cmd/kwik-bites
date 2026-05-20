import React, { useState } from "react";
import { Utensils, AlertTriangle } from "lucide-react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

export default function SafeImage({ src, alt, className = "", ...props }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const isHttp = src?.startsWith("http://");

  const fallbackContent = (
    <div className={`flex flex-col items-center justify-center bg-radial from-slate-50 to-slate-100 border border-slate-100 text-slate-400 p-4 ${className}`}>
      <div className="p-3 bg-red-100 text-red-500 rounded-full mb-2">
        <Utensils className="h-6 w-6" id="fallback-utensils-icon" />
      </div>
      <span className="text-xs font-semibold text-slate-700 text-center truncate w-full px-2">
        {alt || "Gourmet Dish"}
      </span>
      {isHttp && (
        <div 
          className="mt-1 flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100" 
          title="Browsers block HTTP images on secure HTTPS connections. Update to an HTTPS URL for optimal display."
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>HTTP Link (Mixed Content)</span>
        </div>
      )}
    </div>
  );

  if (hasError || !src) {
    return fallbackContent;
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${className}`}
        referrerPolicy="no-referrer"
        {...props}
      />
      {isHttp && (
        <div 
          className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur-xs text-white p-1 rounded-full shadow-md"
          title="This image uses insecure http:// and may be blocked by your browser. Use secure https:// URLs."
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

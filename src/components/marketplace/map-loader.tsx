'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Leaflet map to prevent SSR "window is not defined" errors
const MarketplaceMap = dynamic(
  () => import('./marketplace-map'),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-[400px] rounded-xl bg-muted/30 animate-pulse flex items-center justify-center border border-border">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            Loading Map Interface...
        </span>
      </div>
    )
  }
);

export default MarketplaceMap;

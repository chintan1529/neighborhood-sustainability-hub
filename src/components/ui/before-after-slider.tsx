'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface BeforeAfterSliderProps {
    beforeImage: string;
    afterImage: string;
    beforeLabel?: string;
    afterLabel?: string;
    className?: string;
}

export function BeforeAfterSlider({
    beforeImage,
    afterImage,
    beforeLabel = 'Before',
    afterLabel = 'After',
    className = '',
}: BeforeAfterSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        let clientX = 0;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = (e as React.MouseEvent).clientX;
        }

        const x = clientX - rect.left;
        const width = rect.width;
        
        // Constrain slider position between 0 and 100%
        let newPosition = (x / width) * 100;
        newPosition = Math.max(0, Math.min(100, newPosition));
        
        setSliderPosition(newPosition);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div 
            ref={containerRef}
            className={`relative w-full aspect-video overflow-hidden rounded-xl bg-muted rounded-md touch-none select-none group ${className}`}
            onMouseDown={(e) => {
                setIsDragging(true);
                handleMove(e);
            }}
            onTouchStart={(e) => {
                setIsDragging(true);
                handleMove(e);
            }}
        >
            {/* After Image (Background) */}
            <div className="absolute inset-0 w-full h-full">
                <img 
                    src={afterImage} 
                    alt="After completion" 
                    className="w-full h-full object-cover"
                    draggable={false}
                />
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded">
                    {afterLabel}
                </div>
            </div>

            {/* Before Image (Foreground overlay with clip-path) */}
            <div 
                className="absolute inset-0 w-full h-full border-r-2 border-white/80"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img 
                    src={beforeImage} 
                    alt="Before completion" 
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    draggable={false}
                />
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded">
                    {beforeLabel}
                </div>
            </div>

            {/* Slider Handle */}
            <div 
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${sliderPosition}% - 2px)` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white text-emerald-600 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none">
                    <ArrowLeftRight className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
}

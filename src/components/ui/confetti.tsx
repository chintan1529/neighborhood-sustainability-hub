'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

export interface UnlockedBadge {
    name: string;
    description: string;
    color: string;
    points_reward: number;
}

interface CelebrationProps {
    badges?: UnlockedBadge[];
}

export function AchievementCelebration({ badges }: CelebrationProps) {
    useEffect(() => {
        if (!badges || badges.length === 0) return;

        // Trigger confetti
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: badges.map(b => b.color || '#10B981')
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: badges.map(b => b.color || '#10B981')
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        frame();

        // Show toast for each unlocked badge
        badges.forEach((badge, index) => {
            setTimeout(() => {
                toast.success(`Badge Unlocked: ${badge.name}! 🏅`, {
                    description: `${badge.description} (+${badge.points_reward} pts)`,
                    duration: 6000,
                    style: {
                        border: `1px solid ${badge.color || '#10B981'}`,
                        boxShadow: `0 4px 12px ${badge.color || '#10B981'}30`,
                    }
                });
            }, index * 800); // Stagger toasts if multiple
        });

    }, [badges]);

    return null; // Component is purely logical and drives UI overlays
}

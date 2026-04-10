'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function RecalculateButton() {
    const { toast } = useToast();
    const [isRecalculating, setIsRecalculating] = useState(false);

    const handleRecalculate = async () => {
        setIsRecalculating(true);
        try {
            const res = await fetch('/api/intelligence/recalculate', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                toast({
                    title: 'Risk Scores Recalculated',
                    description: `${data.zonesUpdated} zones updated, ${data.zonesRemoved} stale zones removed in ${data.duration}ms.`,
                });
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            toast({ title: 'Recalculation Failed', description: err.message, variant: 'destructive' });
        } finally {
            setIsRecalculating(false);
        }
    };

    return (
        <Button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            variant="outline"
            size="sm"
            className="gap-2"
        >
            {isRecalculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="h-4 w-4" />
            )}
            {isRecalculating ? 'Recalculating...' : 'Recalculate All'}
        </Button>
    );
}

export function SeedBenchmarksButton() {
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const res = await fetch('/api/intelligence/seed-benchmarks', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                toast({
                    title: 'Benchmarks Seeded',
                    description: `${data.inserted} cities loaded successfully.`,
                });
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            toast({ title: 'Seeding Failed', description: err.message, variant: 'destructive' });
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <Button
            onClick={handleSeed}
            disabled={isSeeding}
            variant="outline"
            size="sm"
            className="gap-2"
        >
            {isSeeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Database className="h-4 w-4" />
            )}
            {isSeeding ? 'Seeding...' : 'Load Gov Data'}
        </Button>
    );
}

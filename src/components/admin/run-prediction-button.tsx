'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function RunPredictionButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRunPrediction = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        const rescueNote = data.rescuedCount
          ? ` ${data.rescuedCount} top candidates were promoted to avoid an empty cycle.`
          : '';
        toast({
          title: "Prediction Complete",
          description: `Generated ${data.predictions?.length || 0} hotspots from ${data.candidateCount || 0} candidates. ${data.filteredOut || 0} candidates were filtered out.${rescueNote}`,
          variant: "default",
        });
      } else {
        throw new Error(data.message || 'Failed to generate predictions');
      }
    } catch (error: any) {
      toast({
        title: "Prediction Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleRunPrediction} 
      disabled={loading}
      variant="outline"
      className="bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Running Prediction Cycle...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Run Prediction Cycle
        </>
      )}
    </Button>
  );
}

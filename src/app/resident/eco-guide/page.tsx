import { Bot, Sparkles } from 'lucide-react';
import { EcoGuideChat } from '@/components/eco-guide/eco-guide-chat';

export const metadata = {
    title: 'Eco Guide — AI Waste Assistant',
    description: 'Get instant AI-powered advice on waste disposal, recycling, and composting',
};

export default function EcoGuidePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        Eco Guide
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
                            <Sparkles className="h-3 w-3" />
                            AI
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Ask anything about waste disposal, recycling, or composting
                    </p>
                </div>
            </div>

            <EcoGuideChat />
        </div>
    );
}

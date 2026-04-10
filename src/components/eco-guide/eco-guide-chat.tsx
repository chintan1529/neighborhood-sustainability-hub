'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Send,
    Image as ImageIcon,
    Bot,
    User,
    Loader2,
    Sparkles,
    X,
    Recycle,
    Trash2,
    Leaf,
    HelpCircle,
} from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image?: string;
    timestamp: Date;
}

const QUICK_SUGGESTIONS = [
    { label: 'Is this recyclable?', icon: Recycle },
    { label: 'Composting tips', icon: Leaf },
    { label: 'E-waste disposal', icon: Trash2 },
    { label: 'Plastic types guide', icon: HelpCircle },
];

const WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content:
        "👋 Hi! I'm your **Eco Guide** — an AI assistant for waste management questions.\n\nI can help you with:\n- **Identifying waste types** — snap a photo or describe the item\n- **Recycling advice** — what can and can't be recycled\n- **Disposal instructions** — how to properly dispose of specific items\n- **Composting tips** — what's compostable and how to do it\n\nAsk me anything, or tap a suggestion below to get started!",
    timestamp: new Date(),
};

export function EcoGuideChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            setSelectedImage(base64);
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() && !selectedImage) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            image: imagePreview || undefined,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const imageToSend = selectedImage;
        removeImage();

        try {
            const res = await fetch('/api/eco-guide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text.trim(),
                    image: imageToSend || undefined,
                }),
            });

            const data = await res.json();

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply || "I'm sorry, I couldn't process that request. Please try again.",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: '⚠️ Something went wrong. Please check your connection and try again.',
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <Card className="flex flex-col h-[calc(100vh-12rem)] shadow-soft overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 animate-fadeIn ${msg.role === 'user' ? 'flex-row-reverse' : ''
                            }`}
                    >
                        {/* Avatar */}
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600'
                                    : 'bg-foreground/10 text-foreground'
                                }`}
                        >
                            {msg.role === 'assistant' ? (
                                <Bot className="h-4 w-4" />
                            ) : (
                                <User className="h-4 w-4" />
                            )}
                        </div>

                        {/* Message Bubble */}
                        <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'assistant'
                                    ? 'bg-card border border-border/60 shadow-subtle'
                                    : 'bg-foreground text-background'
                                }`}
                        >
                            {msg.image && (
                                <img
                                    src={msg.image}
                                    alt="Uploaded"
                                    className="rounded-lg mb-2 max-h-48 object-cover"
                                />
                            )}
                            <div
                                className="whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{
                                    __html: msg.content
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\n/g, '<br/>'),
                                }}
                            />
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                    <div className="flex gap-3 animate-fadeIn">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-card border border-border/60 rounded-2xl px-4 py-3 shadow-subtle">
                            <div className="flex gap-1.5 items-center">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (show only when no user messages) */}
            {messages.length <= 1 && (
                <div className="px-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                        {QUICK_SUGGESTIONS.map((suggestion) => {
                            const Icon = suggestion.icon;
                            return (
                                <button
                                    key={suggestion.label}
                                    onClick={() => sendMessage(suggestion.label)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-card text-xs font-medium hover:shadow-soft hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
                                >
                                    <Icon className="h-3.5 w-3.5 text-emerald-600" />
                                    {suggestion.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Image Preview */}
            {imagePreview && (
                <div className="px-4 pb-2">
                    <div className="relative inline-block">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-20 rounded-lg border border-border/60 object-cover"
                        />
                        <button
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="border-t p-4">
                <div className="flex gap-2 items-end">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="flex-shrink-0 rounded-xl h-10 w-10"
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about waste disposal..."
                        disabled={isLoading}
                        className="rounded-xl h-10"
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || (!input.trim() && !selectedImage)}
                        className="flex-shrink-0 rounded-xl h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="icon"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Powered by AI — Responses may not always be accurate
                </p>
            </form>
        </Card>
    );
}

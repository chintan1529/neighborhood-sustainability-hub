'use client';

import { useState } from 'react';
import { Search, Recycle, Leaf, Package, Trash2, AlertTriangle, FileText, Wine, Wrench, Sparkles, ArrowRight, Globe, TreePine, Droplets, Zap, ChevronRight, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Enhanced waste categories with gradients
const WASTE_CATEGORIES = [
    {
        id: 'plastic',
        name: 'Plastic',
        icon: Recycle,
        gradient: 'from-blue-500 via-cyan-500 to-teal-500',
        lightBg: 'bg-blue-50 dark:bg-blue-950/30',
        shadowColor: 'shadow-blue-500/20',
        description: 'Recyclable plastic items like bottles, containers, and packaging',
        examples: ['Water bottles', 'Milk jugs', 'Shampoo bottles'],
        stat: '80%',
        statLabel: 'Energy saved',
    },
    {
        id: 'glass',
        name: 'Glass',
        icon: Wine,
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
        shadowColor: 'shadow-emerald-500/20',
        description: 'Glass bottles, jars, and containers',
        examples: ['Wine bottles', 'Beer bottles', 'Food jars'],
        stat: '100%',
        statLabel: 'Recyclable',
    },
    {
        id: 'metal',
        name: 'Metal',
        icon: Wrench,
        gradient: 'from-slate-500 via-zinc-500 to-gray-500',
        lightBg: 'bg-slate-50 dark:bg-slate-950/30',
        shadowColor: 'shadow-slate-500/20',
        description: 'Aluminum cans, tin cans, and metal items',
        examples: ['Soft drink cans', 'Food cans', 'Aluminum foil'],
        stat: '95%',
        statLabel: 'Energy saved',
    },
    {
        id: 'paper',
        name: 'Paper',
        icon: FileText,
        gradient: 'from-amber-500 via-yellow-500 to-orange-500',
        lightBg: 'bg-amber-50 dark:bg-amber-950/30',
        shadowColor: 'shadow-amber-500/20',
        description: 'Paper, newspapers, magazines, and documents',
        examples: ['Newspapers', 'Magazines', 'Office paper'],
        stat: '17',
        statLabel: 'Trees saved/ton',
    },
    {
        id: 'cardboard',
        name: 'Cardboard',
        icon: Package,
        gradient: 'from-orange-500 via-amber-500 to-yellow-500',
        lightBg: 'bg-orange-50 dark:bg-orange-950/30',
        shadowColor: 'shadow-orange-500/20',
        description: 'Cardboard boxes, packaging, and cartons',
        examples: ['Shipping boxes', 'Cereal boxes', 'Shoe boxes'],
        stat: '75%',
        statLabel: 'Less energy',
    },
    {
        id: 'organic',
        name: 'Organic',
        icon: Leaf,
        gradient: 'from-green-500 via-emerald-500 to-lime-500',
        lightBg: 'bg-green-50 dark:bg-green-950/30',
        shadowColor: 'shadow-green-500/20',
        description: 'Food waste, garden waste, and biodegradable materials',
        examples: ['Fruit peels', 'Vegetable scraps', 'Coffee grounds'],
        stat: '30%',
        statLabel: 'Waste reduced',
    },
    {
        id: 'hazardous',
        name: 'Hazardous',
        icon: AlertTriangle,
        gradient: 'from-red-500 via-rose-500 to-pink-500',
        lightBg: 'bg-red-50 dark:bg-red-950/30',
        shadowColor: 'shadow-red-500/20',
        description: 'Dangerous materials requiring special disposal',
        examples: ['Batteries', 'Electronics', 'Paint'],
        stat: '100%',
        statLabel: 'Must dispose safely',
    },
    {
        id: 'mixed',
        name: 'Mixed/General',
        icon: Trash2,
        gradient: 'from-slate-600 via-gray-500 to-zinc-500',
        lightBg: 'bg-slate-50 dark:bg-slate-950/30',
        shadowColor: 'shadow-slate-500/20',
        description: 'Non-recyclable items that go to landfill',
        examples: ['Broken ceramics', 'Dirty diapers', 'Pet waste'],
        stat: '50%',
        statLabel: 'Can be reduced',
    },
];

// Searchable items database
const DISPOSAL_ITEMS = [
    { name: 'Plastic bottle', category: 'plastic' },
    { name: 'Water bottle', category: 'plastic' },
    { name: 'Milk jug', category: 'plastic' },
    { name: 'Shampoo bottle', category: 'plastic' },
    { name: 'Yogurt container', category: 'plastic' },
    { name: 'Wine bottle', category: 'glass' },
    { name: 'Beer bottle', category: 'glass' },
    { name: 'Jam jar', category: 'glass' },
    { name: 'Pickle jar', category: 'glass' },
    { name: 'Soda can', category: 'metal' },
    { name: 'Aluminum can', category: 'metal' },
    { name: 'Tin can', category: 'metal' },
    { name: 'Aluminum foil', category: 'metal' },
    { name: 'Newspaper', category: 'paper' },
    { name: 'Magazine', category: 'paper' },
    { name: 'Office paper', category: 'paper' },
    { name: 'Envelope', category: 'paper' },
    { name: 'Cardboard box', category: 'cardboard' },
    { name: 'Pizza box', category: 'cardboard' },
    { name: 'Cereal box', category: 'cardboard' },
    { name: 'Egg carton', category: 'cardboard' },
    { name: 'Banana peel', category: 'organic' },
    { name: 'Apple core', category: 'organic' },
    { name: 'Coffee grounds', category: 'organic' },
    { name: 'Grass clippings', category: 'organic' },
    { name: 'Battery', category: 'hazardous' },
    { name: 'Light bulb', category: 'hazardous' },
    { name: 'Paint can', category: 'hazardous' },
    { name: 'Electronics', category: 'hazardous' },
    { name: 'Old phone', category: 'hazardous' },
    { name: 'Computer', category: 'hazardous' },
    { name: 'Broken plate', category: 'mixed' },
    { name: 'Diaper', category: 'mixed' },
    { name: 'Styrofoam', category: 'mixed' },
];

// Impact statistics
const IMPACT_STATS = [
    { icon: TreePine, value: '17', label: 'Trees saved per ton of paper', gradient: 'from-green-500 to-emerald-500' },
    { icon: Droplets, value: '7,000', label: 'Gallons of water saved', gradient: 'from-blue-500 to-cyan-500' },
    { icon: Zap, value: '95%', label: 'Energy saved recycling aluminum', gradient: 'from-yellow-500 to-orange-500' },
    { icon: Globe, value: '♾️', label: 'Glass can be recycled infinitely', gradient: 'from-purple-500 to-indigo-500' },
];

export default function InfoPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<typeof DISPOSAL_ITEMS>([]);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.length > 1) {
            const results = DISPOSAL_ITEMS.filter(item =>
                item.name.toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const getCategoryInfo = (categoryId: string) => {
        return WASTE_CATEGORIES.find(c => c.id === categoryId);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-[100px] opacity-20 animate-pulse" />
                <div className="absolute top-60 right-20 w-96 h-96 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-[120px] opacity-15 animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-[100px] opacity-10 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative container mx-auto py-8 px-4 max-w-6xl">
                {/* Hero Section */}
                <div className="text-center mb-16 pt-8">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 px-4 py-2 rounded-full mb-6">
                        <Sparkles className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Learn to Recycle Like a Pro</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Waste Classification Guide
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Master the art of recycling. Learn how to properly sort and dispose of your waste to protect our planet for future generations.
                    </p>
                </div>

                {/* Search Section */}
                <div className="relative max-w-2xl mx-auto mb-16">
                    <div className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-105' : ''
                        }`}>
                        <div className={`absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl blur-xl opacity-30 transition-opacity ${isSearchFocused ? 'opacity-50' : 'opacity-30'
                            }`} />
                        <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 p-2 shadow-2xl">
                            <div className="relative flex items-center">
                                <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder="Search for any item... (e.g., plastic bottle, banana peel)"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    className="pl-12 py-6 text-lg border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                                        className="absolute right-4 text-muted-foreground hover:text-foreground"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="border-t border-border/50 mt-2 pt-2 max-h-64 overflow-y-auto">
                                    {searchResults.map((item, index) => {
                                        const category = getCategoryInfo(item.category);
                                        return (
                                            <Link
                                                key={index}
                                                href={`/info/${item.category}`}
                                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                            >
                                                <span className="font-medium">{item.name}</span>
                                                {category && (
                                                    <Badge className={`bg-gradient-to-r ${category.gradient} text-white border-0`}>
                                                        {category.name}
                                                    </Badge>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                        Not sure where something goes? Just search for it!
                    </p>
                </div>

                {/* Impact Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                    {IMPACT_STATS.map((stat, i) => (
                        <div
                            key={i}
                            className="group relative overflow-hidden rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50 p-6 text-center transition-all hover:scale-105 hover:shadow-xl"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center`}>
                                <stat.icon className="h-6 w-6 text-white" />
                            </div>
                            <div className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-1`}>
                                {stat.value}
                            </div>
                            <div className="text-xs text-muted-foreground">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Category Grid Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            Waste Categories
                        </h2>
                        <p className="text-muted-foreground mt-1">Click on any category to learn more</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                        <Recycle className="h-4 w-4" />
                        <span>8 Categories</span>
                    </div>
                </div>

                {/* Category Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    {WASTE_CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const isHovered = hoveredCard === category.id;

                        return (
                            <Link
                                key={category.id}
                                href={`/info/${category.id}`}
                                onMouseEnter={() => setHoveredCard(category.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <div className={`group relative h-full overflow-hidden rounded-2xl transition-all duration-300 ${isHovered ? 'scale-[1.02] shadow-2xl' : 'shadow-lg'
                                    } ${category.shadowColor}`}>
                                    {/* Gradient Border */}
                                    <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} rounded-2xl p-[1px] opacity-50 group-hover:opacity-100 transition-opacity`}>
                                        <div className="absolute inset-[1px] bg-background rounded-[15px]" />
                                    </div>

                                    <div className={`relative h-full ${category.lightBg} rounded-2xl p-6 transition-colors`}>
                                        {/* Icon */}
                                        <div className="relative mb-4">
                                            <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity`} />
                                            <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-r ${category.gradient} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                                                <Icon className="h-7 w-7 text-white" />
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <h3 className={`text-xl font-bold mb-2 bg-gradient-to-r ${category.gradient} bg-clip-text text-transparent`}>
                                            {category.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                            {category.description}
                                        </p>

                                        {/* Examples */}
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {category.examples.map((example, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="secondary"
                                                    className="text-xs bg-background/60 backdrop-blur-sm"
                                                >
                                                    {example}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Stat */}
                                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                            <div>
                                                <span className={`text-xl font-bold bg-gradient-to-r ${category.gradient} bg-clip-text text-transparent`}>
                                                    {category.stat}
                                                </span>
                                                <span className="text-xs text-muted-foreground ml-2">{category.statLabel}</span>
                                            </div>
                                            <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Pro Tips Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-1 mb-16">
                    <div className="bg-background/95 dark:bg-background/90 backdrop-blur-xl rounded-[22px] p-8 md:p-12">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Pro Tips for Better Recycling
                                </h2>
                                <p className="text-muted-foreground">Small actions that make a big difference</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {[
                                { icon: '🧴', tip: 'Always rinse containers before recycling to prevent contamination' },
                                { icon: '📦', tip: 'Flatten cardboard to save space and make collection easier' },
                                { icon: '♻️', tip: 'Check for recycling symbols on plastic items (numbers 1-7)' },
                                { icon: '📸', tip: 'When in doubt, take a photo and use our AI classification!' },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-4 p-4 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/30 transition-all hover:scale-[1.02] hover:shadow-md"
                                >
                                    <span className="text-2xl">{item.icon}</span>
                                    <p className="text-sm">{item.tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-12 text-center text-primary-foreground">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                            <Camera className="h-4 w-4" />
                            <span className="text-sm font-medium">AI-Powered Classification</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Report Waste?</h2>
                        <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                            Found waste that needs to be collected? Report it now and help keep your neighborhood clean!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/resident/report/new">
                                <Button size="lg" variant="secondary" className="group px-8 shadow-xl">
                                    <Recycle className="mr-2 h-5 w-5" />
                                    Report Waste Now
                                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                            <Link href="/resident/classify">
                                <Button size="lg" variant="outline" className="px-8 bg-white/10 border-white/30 hover:bg-white/20">
                                    <Camera className="mr-2 h-5 w-5" />
                                    Try AI Classification
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

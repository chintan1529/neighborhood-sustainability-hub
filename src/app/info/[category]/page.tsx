'use client';

import { useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Check, X, Lightbulb, Recycle, Leaf, Package, Trash2,
    AlertTriangle, FileText, Wine, Wrench, Sparkles, TreePine, Droplets,
    Zap, ChevronRight, ExternalLink, Share2, Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Enhanced waste categories with gradients and more styling
const WASTE_CATEGORIES: Record<string, {
    name: string;
    icon: any;
    gradient: string;
    accentColor: string;
    glowColor: string;
    lightBg: string;
    description: string;
    longDescription: string;
    examples: string[];
    tips: string[];
    notAllowed: string[];
    recyclingProcess: { step: string; description: string }[];
    environmentalImpact: { stat: string; label: string }[];
    funFact: string;
}> = {
    plastic: {
        name: 'Plastic',
        icon: Recycle,
        gradient: 'from-blue-500 via-cyan-500 to-teal-500',
        accentColor: 'text-blue-500',
        glowColor: 'shadow-blue-500/25',
        lightBg: 'bg-blue-50 dark:bg-blue-950/30',
        description: 'Recyclable plastic items like bottles, containers, and packaging',
        longDescription: 'Plastic waste includes items made from polymers that can often be recycled into new products. Proper plastic recycling reduces landfill waste, conserves petroleum resources, and decreases pollution.',
        examples: ['Water bottles (PET #1)', 'Milk jugs (HDPE #2)', 'Shampoo bottles', 'Food containers', 'Laundry detergent bottles', 'Yogurt containers', 'Butter tubs', 'Plastic caps and lids'],
        tips: [
            'Rinse containers to remove food residue',
            'Remove caps and lids (they can often be recycled separately)',
            'Check the recycling symbol (♻️) and number on the bottom',
            'Flatten bottles to save space',
            'Do not bag recyclables - keep them loose',
        ],
        notAllowed: ['Styrofoam/polystyrene', 'Plastic wrap and film', 'Chip bags and candy wrappers', 'Plastic straws', 'Disposable cutlery', 'Toys', 'Garden hoses'],
        recyclingProcess: [
            { step: 'Collection', description: 'Plastics are collected and sorted by resin type' },
            { step: 'Processing', description: 'Cleaned and shredded into tiny flakes' },
            { step: 'Transformation', description: 'Melted and formed into pellets' },
            { step: 'Manufacturing', description: 'Pellets become new products' },
        ],
        environmentalImpact: [
            { stat: '7.4', label: 'Cubic yards of landfill saved per ton' },
            { stat: '1.5T', label: 'CO2 emissions reduced per ton' },
            { stat: '80%', label: 'Energy saved vs new production' },
        ],
        funFact: 'A recycled plastic bottle can become part of a fleece jacket, playground equipment, or even a new bottle!',
    },
    glass: {
        name: 'Glass',
        icon: Wine,
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        accentColor: 'text-emerald-500',
        glowColor: 'shadow-emerald-500/25',
        lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
        description: 'Glass bottles, jars, and containers',
        longDescription: 'Glass is 100% recyclable and can be recycled endlessly without loss of quality. Recycling glass reduces energy consumption and raw material extraction.',
        examples: ['Wine bottles', 'Beer bottles', 'Food jars', 'Sauce bottles', 'Juice bottles', 'Perfume bottles', 'Cosmetic jars', 'Olive oil bottles'],
        tips: [
            'Rinse containers to remove food',
            'Remove metal lids and caps',
            'Separate by color if required in your area',
            'No need to remove paper labels',
            'Handle broken glass carefully',
        ],
        notAllowed: ['Mirrors', 'Light bulbs', 'Window glass', 'Ceramics and pottery', 'Drinking glasses', 'Pyrex and heat-resistant glass', 'Crystal'],
        recyclingProcess: [
            { step: 'Sorting', description: 'Glass separated by color for quality' },
            { step: 'Crushing', description: 'Broken into small pieces called cullet' },
            { step: 'Purification', description: 'Contaminants removed through cleaning' },
            { step: 'Rebirth', description: 'Melted and molded into new glass products' },
        ],
        environmentalImpact: [
            { stat: '4hrs', label: 'Light bulb powered per bottle' },
            { stat: '100%', label: 'Recyclable indefinitely' },
            { stat: '30%', label: 'Energy saved vs new glass' },
        ],
        funFact: 'Glass takes over 1 million years to decompose in a landfill, but can be recycled infinite times!',
    },
    metal: {
        name: 'Metal',
        icon: Wrench,
        gradient: 'from-slate-500 via-zinc-500 to-gray-500',
        accentColor: 'text-slate-500',
        glowColor: 'shadow-slate-500/25',
        lightBg: 'bg-slate-50 dark:bg-slate-950/30',
        description: 'Aluminum cans, tin cans, and metal items',
        longDescription: 'Metals like aluminum and steel are highly recyclable and valuable. Aluminum can be recycled indefinitely, and recycling it uses 95% less energy than producing new aluminum.',
        examples: ['Aluminum soda cans', 'Beer cans', 'Food cans', 'Aluminum foil', 'Metal lids', 'Empty aerosol cans', 'Aluminum trays', 'Metal bottle caps'],
        tips: [
            'Rinse cans to remove food residue',
            'Crush cans to save space (if allowed)',
            'Empty aerosol cans completely',
            'Aluminum foil should be clean and balled up',
            'Keep metal lids attached or ball them up',
        ],
        notAllowed: ['Paint cans with residue', 'Propane tanks', 'Metal clothes hangers', 'Pots and pans', 'Small appliances', 'Scrap metal'],
        recyclingProcess: [
            { step: 'Separation', description: 'Magnets separate steel from aluminum' },
            { step: 'Shredding', description: 'Metals shredded into small pieces' },
            { step: 'Melting', description: 'Purified and cast into ingots' },
            { step: 'Rolling', description: 'Formed into sheets for new products' },
        ],
        environmentalImpact: [
            { stat: '95%', label: 'Energy saved recycling aluminum' },
            { stat: '60', label: 'Days from can to new can' },
            { stat: '∞', label: 'Times aluminum can be recycled' },
        ],
        funFact: 'Recycling just one aluminum can saves enough energy to run a TV for 3 hours!',
    },
    paper: {
        name: 'Paper',
        icon: FileText,
        gradient: 'from-amber-500 via-yellow-500 to-orange-500',
        accentColor: 'text-amber-500',
        glowColor: 'shadow-amber-500/25',
        lightBg: 'bg-amber-50 dark:bg-amber-950/30',
        description: 'Paper, newspapers, magazines, and documents',
        longDescription: 'Paper recycling saves trees, water, and energy. Paper can typically be recycled 5-7 times before the fibers become too short.',
        examples: ['Newspapers', 'Magazines', 'Office paper', 'Envelopes', 'Paper bags', 'Junk mail', 'Phone books', 'Wrapping paper (non-metallic)'],
        tips: [
            'Keep paper clean and dry',
            'Remove plastic windows from envelopes',
            'Shred sensitive documents before recycling',
            'No need to remove staples',
            'Bundle newspapers together',
        ],
        notAllowed: ['Waxed paper', 'Paper towels and napkins', 'Tissues', 'Greasy pizza boxes', 'Paper plates with food', 'Photographs', 'Carbon paper'],
        recyclingProcess: [
            { step: 'Collection', description: 'Papers sorted by grade and quality' },
            { step: 'Pulping', description: 'Mixed with water to create slurry' },
            { step: 'Cleaning', description: 'Ink removed through de-inking process' },
            { step: 'Production', description: 'Formed into new paper products' },
        ],
        environmentalImpact: [
            { stat: '17', label: 'Trees saved per ton' },
            { stat: '7K', label: 'Gallons of water saved' },
            { stat: '4.1K', label: 'kWh electricity saved' },
        ],
        funFact: 'The average American uses about 700 pounds of paper products per year!',
    },
    cardboard: {
        name: 'Cardboard',
        icon: Package,
        gradient: 'from-orange-500 via-amber-500 to-yellow-500',
        accentColor: 'text-orange-500',
        glowColor: 'shadow-orange-500/25',
        lightBg: 'bg-orange-50 dark:bg-orange-950/30',
        description: 'Cardboard boxes, packaging, and cartons',
        longDescription: 'Cardboard is one of the most commonly recycled materials. It can be recycled multiple times and is in high demand by manufacturers.',
        examples: ['Shipping boxes', 'Cereal boxes', 'Shoe boxes', 'Egg cartons', 'Toilet paper rolls', 'Paper towel rolls', 'Moving boxes', 'Product packaging'],
        tips: [
            'Flatten boxes to save space',
            'Remove tape and shipping labels if possible',
            'Remove plastic or foam inserts',
            'Keep cardboard dry',
            'Break down large boxes',
        ],
        notAllowed: ['Waxed cardboard', 'Greasy pizza boxes', 'Wet or moldy cardboard', 'Cardboard with food residue', 'Juice boxes (require special recycling)'],
        recyclingProcess: [
            { step: 'Baling', description: 'Cardboard compressed into large bales' },
            { step: 'Pulping', description: 'Broken down into fiber slurry' },
            { step: 'Filtering', description: 'Contaminants screened and removed' },
            { step: 'Pressing', description: 'Dried and formed into new cardboard' },
        ],
        environmentalImpact: [
            { stat: '75%', label: 'Less energy than new cardboard' },
            { stat: '9', label: 'Cubic yards landfill saved per ton' },
            { stat: '46', label: 'Gallons of oil saved per ton' },
        ],
        funFact: 'Cardboard corrugated boxes are the most recycled packaging material in the world!',
    },
    organic: {
        name: 'Organic',
        icon: Leaf,
        gradient: 'from-green-500 via-emerald-500 to-lime-500',
        accentColor: 'text-green-500',
        glowColor: 'shadow-green-500/25',
        lightBg: 'bg-green-50 dark:bg-green-950/30',
        description: 'Food waste, garden waste, and biodegradable materials',
        longDescription: 'Organic waste can be composted to create nutrient-rich soil. Composting diverts waste from landfills and reduces methane emissions.',
        examples: ['Fruit and vegetable scraps', 'Eggshells', 'Coffee grounds and filters', 'Tea bags', 'Grass clippings', 'Leaves', 'Flowers', 'Nut shells'],
        tips: [
            'Start a home compost bin if possible',
            'Keep meat and dairy separate (if not accepted)',
            'Use biodegradable bags for collection',
            'Chop large items for faster decomposition',
            'Balance greens and browns in composting',
        ],
        notAllowed: ['Plastic bags', 'Meat and fish (in some programs)', 'Dairy products', 'Oils and fats', 'Pet waste', 'Diseased plants'],
        recyclingProcess: [
            { step: 'Collection', description: 'Organic waste gathered separately' },
            { step: 'Processing', description: 'Shredded and mixed for composting' },
            { step: 'Decomposition', description: 'Natural breakdown with heat and microbes' },
            { step: 'Distribution', description: 'Becomes nutrient-rich compost' },
        ],
        environmentalImpact: [
            { stat: '30%', label: 'Reduction in household waste' },
            { stat: '2.6T', label: 'CO2 prevented per ton composted' },
            { stat: '100%', label: 'Natural, chemical-free fertilizer' },
        ],
        funFact: 'Composting for just 6 months can create enough soil to fill a garden bed!',
    },
    hazardous: {
        name: 'Hazardous',
        icon: AlertTriangle,
        gradient: 'from-red-500 via-rose-500 to-pink-500',
        accentColor: 'text-red-500',
        glowColor: 'shadow-red-500/25',
        lightBg: 'bg-red-50 dark:bg-red-950/30',
        description: 'Dangerous materials requiring special disposal',
        longDescription: 'Hazardous waste contains chemicals that can harm human health and the environment. These items must be disposed of properly at designated facilities.',
        examples: ['Batteries (all types)', 'Electronics (phones, computers)', 'Fluorescent light bulbs', 'Paint and solvents', 'Motor oil', 'Pesticides', 'Cleaning chemicals', 'Medications'],
        tips: [
            'Never put in regular trash',
            'Keep in original containers when possible',
            'Use designated collection events or drop-off sites',
            'Store safely until proper disposal',
            'Check with local authorities for disposal options',
        ],
        notAllowed: ['Regular trash bins', 'Pouring down drains', 'Burning', 'Mixing with other waste'],
        recyclingProcess: [
            { step: 'Collection', description: 'Specialized pickup at designated sites' },
            { step: 'Classification', description: 'Sorted by hazard type and risk level' },
            { step: 'Treatment', description: 'Neutralized or processed safely' },
            { step: 'Recovery', description: 'Materials recovered or safely disposed' },
        ],
        environmentalImpact: [
            { stat: '100%', label: 'Pollution prevention when disposed properly' },
            { stat: '0', label: 'Contamination to soil and water' },
            { stat: '∞', label: 'Wildlife and human lives protected' },
        ],
        funFact: 'A single quart of motor oil can contaminate up to 250,000 gallons of drinking water!',
    },
    mixed: {
        name: 'Mixed/General',
        icon: Trash2,
        gradient: 'from-slate-600 via-gray-500 to-zinc-500',
        accentColor: 'text-slate-500',
        glowColor: 'shadow-slate-500/25',
        lightBg: 'bg-slate-50 dark:bg-slate-950/30',
        description: 'Non-recyclable items that go to landfill',
        longDescription: 'Mixed waste includes items that cannot be recycled or composted. The goal is to minimize this category by choosing recyclable alternatives.',
        examples: ['Broken ceramics', 'Dirty diapers', 'Pet waste', 'Cigarette butts', 'Broken toys', 'Foam packaging', 'Rubber items', 'Heavily soiled items'],
        tips: [
            'Try to minimize mixed waste',
            'Always check if items can be recycled first',
            'Donate usable items instead of throwing away',
            'Consider repairing before replacing',
            'Choose products with less packaging',
        ],
        notAllowed: ['Recyclable materials', 'Hazardous waste', 'Electronics', 'Batteries', 'Organic waste that can be composted'],
        recyclingProcess: [
            { step: 'Collection', description: 'Waste gathered from bins and collection points' },
            { step: 'Transport', description: 'Delivered to processing facilities' },
            { step: 'Recovery', description: 'Some materials recovered if possible' },
            { step: 'Disposal', description: 'Remaining waste goes to managed landfill' },
        ],
        environmentalImpact: [
            { stat: '50%', label: 'Can be reduced with better sorting' },
            { stat: '1', label: 'Small change = big difference' },
            { stat: '♻️', label: 'Every item checked = waste reduced' },
        ],
        funFact: 'The average person generates over 4 pounds of trash every single day!',
    },
};

export default function CategoryPage() {
    const params = useParams();
    const categorySlug = params.category as string;
    const category = WASTE_CATEGORIES[categorySlug];

    const [activeTab, setActiveTab] = useState<'examples' | 'notallowed'>('examples');
    const [hoveredStep, setHoveredStep] = useState<number | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);

    if (!category) {
        notFound();
    }

    const Icon = category.icon;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-20 left-10 w-72 h-72 bg-gradient-to-r ${category.gradient} rounded-full blur-[100px] opacity-20 animate-pulse`} />
                <div className={`absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r ${category.gradient} rounded-full blur-[120px] opacity-15 animate-pulse`} style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative container mx-auto py-8 px-4 max-w-5xl">
                {/* Navigation Bar */}
                <nav className="flex items-center justify-between mb-8">
                    <Link href="/info">
                        <Button variant="ghost" className="group gap-2 hover:bg-muted/50">
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            <span>Back to Guide</span>
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsBookmarked(!isBookmarked)}
                            className={isBookmarked ? 'text-yellow-500' : ''}
                        >
                            <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </div>
                </nav>

                {/* Hero Section */}
                <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${category.gradient} p-1 mb-10`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                    <div className="relative bg-background/95 dark:bg-background/90 backdrop-blur-xl rounded-[22px] p-8 md:p-12">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                            {/* Animated Icon */}
                            <div className={`relative group`}>
                                <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                                <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-r ${category.gradient} flex items-center justify-center shadow-2xl ${category.glowColor} transform transition-transform hover:scale-105`}>
                                    <Icon className="h-10 w-10 md:h-12 md:w-12 text-white" />
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${category.gradient} bg-clip-text text-transparent`}>
                                        {category.name}
                                    </h1>
                                    <Sparkles className={`h-6 w-6 ${category.accentColor} animate-pulse`} />
                                </div>
                                <p className="text-xl text-muted-foreground">{category.description}</p>
                            </div>
                        </div>

                        <p className="text-lg leading-relaxed text-foreground/80 max-w-3xl">
                            {category.longDescription}
                        </p>
                    </div>
                </div>

                {/* Impact Stats */}
                <div className="grid grid-cols-3 gap-4 mb-10">
                    {category.environmentalImpact.map((impact, i) => (
                        <div
                            key={i}
                            className={`group relative overflow-hidden rounded-2xl ${category.lightBg} border border-border/50 p-6 text-center transition-all hover:scale-105 hover:shadow-xl ${category.glowColor}`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                            <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${category.gradient} bg-clip-text text-transparent mb-1`}>
                                {impact.stat}
                            </div>
                            <div className="text-sm text-muted-foreground">{impact.label}</div>
                        </div>
                    ))}
                </div>

                {/* Examples / Not Allowed Toggle */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="flex bg-muted/50 rounded-full p-1">
                            <button
                                onClick={() => setActiveTab('examples')}
                                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'examples'
                                        ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg`
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Check className="inline h-4 w-4 mr-2" />
                                What to Include
                            </button>
                            <button
                                onClick={() => setActiveTab('notallowed')}
                                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'notallowed'
                                        ? 'bg-red-500 text-white shadow-lg'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <X className="inline h-4 w-4 mr-2" />
                                What NOT to Include
                            </button>
                        </div>
                    </div>

                    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-300`}>
                        {(activeTab === 'examples' ? category.examples : category.notAllowed).map((item, i) => (
                            <div
                                key={i}
                                className={`group relative overflow-hidden rounded-xl border p-4 transition-all hover:scale-105 hover:shadow-lg ${activeTab === 'examples'
                                        ? `${category.lightBg} border-border/50 hover:border-green-300`
                                        : 'bg-red-50 dark:bg-red-950/30 border-red-200/50 hover:border-red-300'
                                    }`}
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className="flex items-start gap-2">
                                    {activeTab === 'examples' ? (
                                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    <span className="text-sm">{item}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pro Tips */}
                <div className={`relative overflow-hidden rounded-2xl border border-yellow-200 dark:border-yellow-900/50 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 p-8 mb-10`}>
                    <div className="absolute top-4 right-4">
                        <Lightbulb className="h-24 w-24 text-yellow-200 dark:text-yellow-900/30" />
                    </div>
                    <div className="relative">
                        <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center">
                                <Lightbulb className="h-5 w-5 text-white" />
                            </div>
                            Pro Tips for Better Recycling
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {category.tips.map((tip, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 bg-white/60 dark:bg-white/5 rounded-xl p-4 border border-yellow-200/50 dark:border-yellow-900/30"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                                        {i + 1}
                                    </div>
                                    <p className="text-yellow-900 dark:text-yellow-100 text-sm">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recycling Process Timeline */}
                <div className="mb-10">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${category.gradient} flex items-center justify-center`}>
                            <Recycle className="h-5 w-5 text-white" />
                        </div>
                        The Recycling Journey
                    </h2>

                    <div className="relative">
                        {/* Timeline line */}
                        <div className={`absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b ${category.gradient} rounded-full opacity-30`} />

                        <div className="space-y-4">
                            {category.recyclingProcess.map((process, i) => (
                                <div
                                    key={i}
                                    className={`relative flex items-start gap-6 pl-2 transition-all duration-300 ${hoveredStep === i ? 'scale-[1.02]' : ''
                                        }`}
                                    onMouseEnter={() => setHoveredStep(i)}
                                    onMouseLeave={() => setHoveredStep(null)}
                                >
                                    {/* Step number */}
                                    <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg transition-all ${hoveredStep === i
                                            ? `bg-gradient-to-r ${category.gradient} scale-110`
                                            : `bg-gradient-to-r ${category.gradient} opacity-80`
                                        }`}>
                                        {i + 1}
                                    </div>

                                    {/* Content */}
                                    <div className={`flex-1 rounded-2xl border p-6 transition-all ${hoveredStep === i
                                            ? `${category.lightBg} border-transparent shadow-xl ${category.glowColor}`
                                            : 'bg-muted/30 border-border/50'
                                        }`}>
                                        <h3 className="font-semibold text-lg mb-1">{process.step}</h3>
                                        <p className="text-muted-foreground">{process.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fun Fact */}
                <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${category.gradient} p-1 mb-10`}>
                    <div className="bg-background/95 dark:bg-background/90 backdrop-blur-xl rounded-[14px] p-8">
                        <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r ${category.gradient} flex items-center justify-center`}>
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg mb-2 bg-gradient-to-r ${category.gradient} bg-clip-text text-transparent`}>
                                    Did You Know?
                                </h3>
                                <p className="text-lg">{category.funFact}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Environmental Impact Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border border-green-200 dark:border-green-900/50 p-8 mb-10">
                    <div className="absolute -right-8 -bottom-8 opacity-10">
                        <TreePine className="w-48 h-48" />
                    </div>
                    <div className="relative flex items-start gap-6">
                        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25">
                            <Leaf className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-3">
                                Your Environmental Impact
                            </h3>
                            <p className="text-green-700 dark:text-green-300 text-lg leading-relaxed">
                                By properly recycling {category.name.toLowerCase()} waste, you're making a real difference.
                                Every item you recycle correctly helps protect our planet for future generations.
                            </p>
                            <div className="flex items-center gap-4 mt-6">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <TreePine className="h-5 w-5" />
                                    <span className="text-sm">Saves Trees</span>
                                </div>
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <Droplets className="h-5 w-5" />
                                    <span className="text-sm">Conserves Water</span>
                                </div>
                                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                                    <Zap className="h-5 w-5" />
                                    <span className="text-sm">Saves Energy</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center py-10">
                    <h2 className="text-2xl font-bold mb-4">Ready to Report {category.name} Waste?</h2>
                    <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                        Help keep your neighborhood clean by reporting {category.name.toLowerCase()} waste that needs collection.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/resident/report/new">
                            <Button
                                size="lg"
                                className={`group bg-gradient-to-r ${category.gradient} hover:opacity-90 text-white shadow-xl ${category.glowColor} px-8`}
                            >
                                <Recycle className="mr-2 h-5 w-5" />
                                Report {category.name} Waste
                                <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>
                        <Link href="/info">
                            <Button variant="outline" size="lg" className="px-8">
                                <ExternalLink className="mr-2 h-5 w-5" />
                                Explore Other Categories
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

import type { WasteCategory, ReportStatus, UserRole } from '@/types/database';

// App metadata
export const APP_NAME = 'Neighborhood Sustainability Hub';
export const APP_DESCRIPTION = 'Hyperlocal waste management for sustainable communities';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// API endpoints
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Waste categories with metadata
export const WASTE_CATEGORIES: Record<WasteCategory, { label: string; color: string; icon: string; description: string }> = {
    plastic: {
        label: 'Plastic',
        color: '#EF4444',
        icon: '🧴',
        description: 'Bottles, containers, packaging',
    },
    cardboard: {
        label: 'Cardboard',
        color: '#F59E0B',
        icon: '📦',
        description: 'Boxes, packaging, paper tubes',
    },
    paper: {
        label: 'Paper',
        color: '#10B981',
        icon: '📄',
        description: 'Newspapers, magazines, documents',
    },
    metal: {
        label: 'Metal',
        color: '#6B7280',
        icon: '🥫',
        description: 'Cans, foil, hardware',
    },
    glass: {
        label: 'Glass',
        color: '#3B82F6',
        icon: '🍾',
        description: 'Bottles, jars, broken glass',
    },
    organic: {
        label: 'Organic',
        color: '#84CC16',
        icon: '🍂',
        description: 'Food waste, garden waste',
    },
    mixed: {
        label: 'Mixed',
        color: '#8B5CF6',
        icon: '🗑️',
        description: 'Unsorted or mixed waste',
    },
};

// Report statuses with metadata
export const REPORT_STATUSES: Record<ReportStatus, { label: string; color: string; bgColor: string; description: string }> = {
    pending: {
        label: 'Pending',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        description: 'Awaiting collector',
    },
    assigned: {
        label: 'Assigned',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        description: 'Collector assigned',
    },
    in_progress: {
        label: 'In Progress',
        color: '#8B5CF6',
        bgColor: '#EDE9FE',
        description: 'Collector en route',
    },
    completed: {
        label: 'Completed',
        color: '#10B981',
        bgColor: '#D1FAE5',
        description: 'Successfully collected',
    },
    cancelled: {
        label: 'Cancelled',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        description: 'Report cancelled',
    },
};

// User roles with metadata
export const USER_ROLES: Record<UserRole, { label: string; description: string; dashboardPath: string }> = {
    resident: {
        label: 'Resident',
        description: 'Report waste and earn points',
        dashboardPath: '/resident',
    },
    collector: {
        label: 'Collector',
        description: 'Claim and complete waste collection',
        dashboardPath: '/collector',
    },
    admin: {
        label: 'Admin',
        description: 'Manage neighborhood and view analytics',
        dashboardPath: '/admin',
    },
};

// Points system
export const POINTS = {
    REPORT_CREATED: 10,
    CORRECT_SEGREGATION: 5,
    STREAK_BONUS_MULTIPLIER: 1.5,
    CHALLENGE_COMPLETED: 50,
    BADGE_EARNED: 25,
} as const;

// SLA settings (in hours)
export const SLA = {
    TARGET_HOURS: 24,
    WARNING_HOURS: 18,
    CRITICAL_HOURS: 22,
} as const;

// Map settings
export const MAP_CONFIG = {
    DEFAULT_CENTER: [12.9716, 77.5946] as [number, number], // Bangalore
    DEFAULT_ZOOM: 15,
    MIN_ZOOM: 10,
    MAX_ZOOM: 19,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
} as const;

// Image upload settings
export const IMAGE_UPLOAD = {
    MAX_SIZE_MB: 5,
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    MAX_WIDTH: 1200,
    COMPRESSION_QUALITY: 0.8,
} as const;

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
} as const;

// Badge tiers
export const BADGE_TIERS: Record<number, { label: string; color: string }> = {
    1: { label: 'Common', color: '#9CA3AF' },
    2: { label: 'Uncommon', color: '#10B981' },
    3: { label: 'Rare', color: '#3B82F6' },
    4: { label: 'Epic', color: '#8B5CF6' },
    5: { label: 'Legendary', color: '#F59E0B' },
};

// Navigation items by role
export const NAV_ITEMS = {
    resident: [
        { label: 'Home', href: '/resident', icon: 'Home' },
        { label: 'New Report', href: '/resident/report/new', icon: 'Plus' },
        { label: 'My Reports', href: '/resident/reports', icon: 'FileText' },
        { label: 'Eco Guide', href: '/resident/eco-guide', icon: 'Bot' },
        { label: 'Marketplace', href: '/resident/marketplace', icon: 'Store' },
        { label: 'My Impact', href: '/resident/impact', icon: 'Leaf' },
        { label: 'Leaderboard', href: '/resident/leaderboard', icon: 'BarChart3' },
        { label: 'Challenges', href: '/resident/challenges', icon: 'Trophy' },
        { label: 'Workshops', href: '/resident/workshops', icon: 'CalendarDays' },
        { label: 'Messages', href: '/resident/messages', icon: 'MessageSquare' },
        { label: 'Complaints', href: '/resident/complaints', icon: 'MessageSquareWarning' },
        { label: 'Waste Guide', href: '/info', icon: 'BookOpen' },
        { label: 'Profile', href: '/resident/profile', icon: 'User' },
    ],
    collector: [
        { label: 'Queue', href: '/collector', icon: 'List' },
        { label: 'Map', href: '/collector/map', icon: 'Map' },
        { label: 'Marketplace', href: '/collector/marketplace', icon: 'Store' },
        { label: 'My Offers', href: '/collector/offers', icon: 'Tag' },
        { label: 'Smart Routes', href: '/collector/routes', icon: 'Route' },
        { label: 'History', href: '/collector/history', icon: 'Clock' },
        { label: 'Messages', href: '/collector/messages', icon: 'MessageSquare' },
        { label: 'Waste Guide', href: '/info', icon: 'BookOpen' },
        { label: 'Settings', href: '/collector/settings', icon: 'Settings' },
        { label: 'Profile', href: '/collector/profile', icon: 'User' },
    ],
    admin: [
        { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
        { label: 'Intelligence', href: '/admin/intelligence', icon: 'Brain' },
        { label: 'Reports', href: '/admin/reports', icon: 'FileText' },
        { label: 'Reviews', href: '/admin/reviews', icon: 'Star' },
        { label: 'Users', href: '/admin/users', icon: 'Users' },
        { label: 'Challenges', href: '/admin/challenges', icon: 'Trophy' },
        { label: 'Workshops', href: '/admin/workshops', icon: 'CalendarDays' },
        { label: 'Badges', href: '/admin/badges', icon: 'Award' },
        { label: 'Transfer Stations', href: '/admin/transfer-stations', icon: 'Warehouse' },
        { label: 'Recyclers', href: '/admin/recyclers', icon: 'Recycle' },
        { label: 'Marketplace', href: '/admin/marketplace', icon: 'Store' },
        { label: 'Complaints', href: '/admin/complaints', icon: 'MessageSquareWarning' },
        { label: 'Waste Guide', href: '/info', icon: 'BookOpen' },
        { label: 'Export', href: '/admin/export', icon: 'Download' },
        { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
    ],
} as const;

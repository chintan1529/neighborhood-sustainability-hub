import type { WasteCategory, ReportStatus, UserRole } from "@/types/database";

// App metadata
export const APP_NAME = "Neighborhood Sustainability Hub";
export const APP_DESCRIPTION =
  "Hyperlocal waste management for sustainable communities";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// API endpoints
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Waste categories with metadata
export const WASTE_CATEGORIES: Record<
  WasteCategory,
  { label: string; color: string; icon: string; description: string }
> = {
  plastic: {
    label: "Plastic",
    color: "#EF4444",
    icon: "🧴",
    description: "Bottles, containers, packaging",
  },
  cardboard: {
    label: "Cardboard",
    color: "#F59E0B",
    icon: "📦",
    description: "Boxes, packaging, paper tubes",
  },
  paper: {
    label: "Paper",
    color: "#10B981",
    icon: "📄",
    description: "Newspapers, magazines, documents",
  },
  metal: {
    label: "Metal",
    color: "#6B7280",
    icon: "🥫",
    description: "Cans, foil, hardware",
  },
  glass: {
    label: "Glass",
    color: "#3B82F6",
    icon: "🍾",
    description: "Bottles, jars, broken glass",
  },
  organic: {
    label: "Organic",
    color: "#84CC16",
    icon: "🍂",
    description: "Food waste, garden waste",
  },
  mixed: {
    label: "Mixed",
    color: "#8B5CF6",
    icon: "🗑️",
    description: "Unsorted or mixed waste",
  },
};

// Report statuses with metadata
export const REPORT_STATUSES: Record<
  ReportStatus,
  { label: string; color: string; bgColor: string; description: string }
> = {
  pending: {
    label: "Pending",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    description: "Awaiting collector",
  },
  assigned: {
    label: "Assigned",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    description: "Collector assigned",
  },
  in_progress: {
    label: "In Progress",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
    description: "Collector en route",
  },
  completed: {
    label: "Completed",
    color: "#10B981",
    bgColor: "#D1FAE5",
    description: "Successfully collected",
  },
  cancelled: {
    label: "Cancelled",
    color: "#EF4444",
    bgColor: "#FEE2E2",
    description: "Report cancelled",
  },
};

// User roles with metadata
export const USER_ROLES: Record<
  UserRole,
  { label: string; description: string; dashboardPath: string }
> = {
  resident: {
    label: "Resident",
    description: "Report waste and earn points",
    dashboardPath: "/resident",
  },
  collector: {
    label: "Collector",
    description: "Claim and complete waste collection",
    dashboardPath: "/collector",
  },
  recycler: {
    label: "Recycler",
    description: "Buy pre-sorted recyclable waste from the marketplace",
    dashboardPath: "/recycler",
  },
  admin: {
    label: "Admin",
    description: "Manage neighborhood and view analytics",
    dashboardPath: "/admin",
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
  TILE_LAYER: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  ATTRIBUTION:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
} as const;

// Image upload settings
export const IMAGE_UPLOAD = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp", "image/heic"],
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
  1: { label: "Common", color: "#9CA3AF" },
  2: { label: "Uncommon", color: "#10B981" },
  3: { label: "Rare", color: "#3B82F6" },
  4: { label: "Epic", color: "#8B5CF6" },
  5: { label: "Legendary", color: "#F59E0B" },
};

// Navigation items by role — grouped for sidebar sections
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  section?: string;
}

export const NAV_ITEMS: Record<string, NavItem[]> = {
  resident: [
    { label: "Home", href: "/resident", icon: "Home", section: "Main" },
    { label: "New Report", href: "/resident/report/new", icon: "Plus", section: "Main" },
    { label: "My Reports", href: "/resident/reports", icon: "FileText", section: "Main" },
    { label: "Marketplace", href: "/resident/marketplace", icon: "Store", section: "Discover" },
    { label: "Eco Guide", href: "/resident/eco-guide", icon: "Bot", section: "Discover" },
    { label: "My Impact", href: "/resident/impact", icon: "Leaf", section: "Discover" },
    { label: "Leaderboard", href: "/resident/leaderboard", icon: "BarChart3", section: "Community" },
    { label: "Challenges", href: "/resident/challenges", icon: "Trophy", section: "Community" },
    { label: "Workshops", href: "/resident/workshops", icon: "CalendarDays", section: "Community" },
    { label: "Messages", href: "/resident/messages", icon: "MessageSquare", section: "Community" },
    { label: "Complaints", href: "/resident/complaints", icon: "MessageSquareWarning", section: "Community" },
    { label: "Profile", href: "/resident/profile", icon: "User", section: "Account" },
    { label: "Waste Guide", href: "/info", icon: "BookOpen", section: "Account" },
  ],
  collector: [
    { label: "Queue", href: "/collector", icon: "List", section: "Operations" },
    { label: "Map", href: "/collector/map", icon: "Map", section: "Operations" },
    { label: "Smart Routes", href: "/collector/routes", icon: "Route", section: "Operations" },
    { label: "History", href: "/collector/history", icon: "Clock", section: "Operations" },
    { label: "Messages", href: "/collector/messages", icon: "MessageSquare", section: "Communication" },
    { label: "Waste Guide", href: "/info", icon: "BookOpen", section: "Account" },
    { label: "Settings", href: "/collector/settings", icon: "Settings", section: "Account" },
    { label: "Profile", href: "/collector/profile", icon: "User", section: "Account" },
  ],
  recycler: [
    { label: "Dashboard", href: "/recycler", icon: "LayoutDashboard", section: "Overview" },
    { label: "Marketplace", href: "/recycler/marketplace", icon: "Store", section: "Business" },
    { label: "My Offers", href: "/recycler/offers", icon: "Tag", section: "Business" },
    { label: "Pickups", href: "/recycler/pickups", icon: "Truck", section: "Business" },
    { label: "Transactions", href: "/recycler/transactions", icon: "Receipt", section: "Business" },
    { label: "Analytics", href: "/recycler/analytics", icon: "BarChart3", section: "Business" },
    { label: "Verification", href: "/recycler/verification", icon: "ShieldCheck", section: "Account" },
    { label: "Messages", href: "/recycler/messages", icon: "MessageSquare", section: "Account" },
    { label: "Waste Guide", href: "/info", icon: "BookOpen", section: "Account" },
    { label: "Profile", href: "/recycler/profile", icon: "User", section: "Account" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", section: "Overview" },
    { label: "Intelligence", href: "/admin/intelligence", icon: "Brain", section: "Overview" },
    { label: "Reports", href: "/admin/reports", icon: "FileText", section: "Management" },
    { label: "Users", href: "/admin/users", icon: "Users", section: "Management" },
    { label: "Recyclers", href: "/admin/recyclers", icon: "Recycle", section: "Management" },
    { label: "Marketplace", href: "/admin/marketplace", icon: "Store", section: "Management" },
    { label: "Reviews", href: "/admin/reviews", icon: "Star", section: "Management" },
    { label: "Complaints", href: "/admin/complaints", icon: "MessageSquareWarning", section: "Management" },
    { label: "Challenges", href: "/admin/challenges", icon: "Trophy", section: "Engagement" },
    { label: "Workshops", href: "/admin/workshops", icon: "CalendarDays", section: "Engagement" },
    { label: "Badges", href: "/admin/badges", icon: "Award", section: "Engagement" },
    { label: "Transfer Stations", href: "/admin/transfer-stations", icon: "Warehouse", section: "System" },
    { label: "Export", href: "/admin/export", icon: "Download", section: "System" },
    { label: "Waste Guide", href: "/info", icon: "BookOpen", section: "System" },
    { label: "Settings", href: "/admin/settings", icon: "Settings", section: "System" },
  ],
};

import {
  BarChart3,
  Calculator,
  LayoutDashboard,
  LineChart,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { PRODUCT_CATEGORIES } from "@/lib/types";

export type NavSectionId = "home" | "portfolio" | "desk" | "intel";

export type SubNavItem = {
  href: string;
  label: string;
  match?: (pathname: string) => boolean;
};

export type MainNavItem = {
  id: NavSectionId;
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  subNav?: SubNavItem[];
};

export const mainSections: MainNavItem[] = [
  {
    id: "home",
    href: "/",
    label: "Home",
    icon: LayoutDashboard,
    match: (p) => p === "/",
  },
  {
    id: "portfolio",
    href: "/portfolio/analytics",
    label: "Portfolio",
    icon: BarChart3,
    match: (p) => p.startsWith("/portfolio"),
    subNav: [
      { href: "/portfolio/analytics", label: "Analytics Lab", match: (p) => p.startsWith("/portfolio/analytics") },
    ],
  },
  {
    id: "desk",
    href: "/desk",
    label: "Desk",
    icon: Calculator,
    match: (p) => p.startsWith("/desk") || p.startsWith("/valuation") || p.startsWith("/payoff"),
    subNav: [
      { href: "/desk", label: "Command", match: (p) => p === "/desk" },
      { href: "/valuation", label: "Valuation", match: (p) => p.startsWith("/valuation") },
      { href: "/payoff", label: "Payoff", match: (p) => p.startsWith("/payoff") },
    ],
  },
  {
    id: "intel",
    href: "/intelligence",
    label: "Intel",
    icon: Sparkles,
    match: (p) => p.startsWith("/intelligence"),
    subNav: [{ href: "/intelligence", label: "Logic Atlas", match: (p) => p.startsWith("/intelligence") }],
  },
];

export const categoryQuickLinks = PRODUCT_CATEGORIES.map((category) => ({
  category,
}));

export function resolveNavSection(pathname: string): MainNavItem {
  return mainSections.find((s) => s.match(pathname)) ?? mainSections[0];
}

export const commandRoutes = [
  { href: "/", label: "Home", group: "Navigate" },
  { href: "/portfolio/analytics", label: "Analytics Lab", group: "Portfolio" },
  { href: "/desk", label: "Desk Command", group: "Desk" },
  { href: "/valuation", label: "Valuation", group: "Desk" },
  { href: "/payoff", label: "Payoff", group: "Desk" },
  { href: "/intelligence", label: "Logic Atlas", group: "Intel" },
  { href: "/upload", label: "Upload Master", group: "Data" },
];

export const headerActions = {
  upload: { href: "/upload", label: "Upload", icon: Upload },
  search: { label: "Search", icon: Search },
  analytics: { href: "/portfolio/analytics", label: "Analytics", icon: BarChart3 },
  payoff: { href: "/payoff", label: "Payoff", icon: LineChart },
};

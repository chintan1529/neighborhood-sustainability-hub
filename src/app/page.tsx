import Link from "next/link";
import {
  ArrowRight,
  Leaf,
  MapPin,
  Trophy,
  Recycle,
  Users,
  BarChart3,
  Camera,
  Shield,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
              <Leaf className="h-3.5 w-3.5 text-background" />
            </div>
            <span className="font-semibold text-sm tracking-tight">NHS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              How It Works
            </a>
            <a
              href="#impact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Impact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition-colors duration-150"
            >
              Get Started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 bg-secondary text-muted-foreground px-3 py-1.5 rounded-lg text-xs font-medium mb-6">
              <Recycle className="h-3.5 w-3.5" />
              Sustainable Communities Start Here
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold text-foreground mb-5 tracking-tight leading-[1.1]">
              Transform Your Neighborhood&apos;s{" "}
              <span className="text-emerald-600 dark:text-emerald-400">Waste Management</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Report waste in 15 seconds, earn rewards, and track your
              community&apos;s environmental impact. AI-powered classification
              meets hyperlocal action.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors duration-150 shadow-sm"
              >
                Start Reporting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors duration-150"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Hero Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "10K+", label: "Reports Filed" },
              { value: "95%", label: "SLA Compliance" },
              { value: "500+", label: "Active Users" },
              { value: "24h", label: "Avg Resolution" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card border border-border rounded-xl p-5 text-center"
              >
                <div className="text-2xl font-semibold text-foreground tracking-tight tabular-nums">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-2">
              Features
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold mb-3 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              From AI-powered classification to real-time tracking, we&apos;ve
              got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: MapPin,
                title: "Location-Based Reporting",
                description:
                  "Pin exact locations on the map for precise waste identification and faster resolution.",
              },
              {
                icon: Camera,
                title: "AI Classification",
                description:
                  "Automatic waste categorization using AI. 7 categories: Plastic, Paper, Metal, Glass, Cardboard, Organic, Mixed.",
              },
              {
                icon: Trophy,
                title: "Gamification & Rewards",
                description:
                  "Earn points, unlock badges, climb leaderboards, and participate in community challenges.",
              },
              {
                icon: Users,
                title: "Community Driven",
                description:
                  "Connect with your neighborhood, compete on leaderboards, and celebrate collective impact.",
              },
              {
                icon: BarChart3,
                title: "Admin Dashboard",
                description:
                  "Real-time analytics, SLA monitoring, and one-click municipal compliance reports.",
              },
              {
                icon: Shield,
                title: "SDG Aligned",
                description:
                  "Track your contribution to UN Sustainable Development Goals 11.6 and 12.5.",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors duration-150"
                >
                  <Icon className="h-5 w-5 text-muted-foreground mb-4" />
                  <h3 className="text-sm font-semibold mb-1.5 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-2">
              How It Works
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold mb-3 tracking-tight">
              Report Waste in 15 Seconds
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Three simple steps to a cleaner neighborhood.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-0 max-w-4xl mx-auto relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-border" />

            {[
              {
                step: "01",
                title: "Snap a Photo",
                description:
                  "Open the app, snap a photo of the waste. Our AI automatically classifies it.",
                icon: Camera,
              },
              {
                step: "02",
                title: "Pin Location",
                description:
                  "Confirm the location on the map or let GPS do it automatically.",
                icon: MapPin,
              },
              {
                step: "03",
                title: "Track & Earn",
                description:
                  "Submit and track progress. Earn points when collection is complete!",
                icon: Trophy,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative text-center p-6">
                  <div className="relative z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background text-sm font-semibold mb-5">
                    {item.step}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold mb-2 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section id="impact" className="py-20 bg-foreground text-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-emerald-400 tracking-widest uppercase mb-2">
              Impact
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold mb-3 tracking-tight">
              Aligned with UN SDGs
            </h2>
            <p className="text-sm text-background/60 max-w-xl mx-auto">
              Every report contributes to global sustainability targets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="border border-background/10 rounded-xl p-6">
              <p className="text-xs font-medium text-background/50 uppercase tracking-wider mb-3">
                SDG 11.6
              </p>
              <h3 className="text-lg font-semibold mb-2 tracking-tight">
                Sustainable Cities
              </h3>
              <p className="text-background/60 text-sm leading-relaxed mb-4">
                Reduce the adverse per capita environmental impact of cities by
                paying special attention to municipal waste management.
              </p>
              <div className="flex items-center gap-3 text-sm text-background/50">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Waste tracking
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Urban cleanup
                </div>
              </div>
            </div>
            <div className="border border-background/10 rounded-xl p-6">
              <p className="text-xs font-medium text-background/50 uppercase tracking-wider mb-3">
                SDG 12.5
              </p>
              <h3 className="text-lg font-semibold mb-2 tracking-tight">
                Responsible Consumption
              </h3>
              <p className="text-background/60 text-sm leading-relaxed mb-4">
                Substantially reduce waste generation through prevention,
                reduction, recycling, and reuse.
              </p>
              <div className="flex items-center gap-3 text-sm text-background/50">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> AI sorting
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Recycling guides
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold mb-3 tracking-tight">
              Ready to Make a Difference?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Join thousands of residents building cleaner, more sustainable
              neighborhoods.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors duration-150 shadow-sm"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
                <Leaf className="h-3 w-3 text-background" />
              </div>
              <span className="font-medium text-sm">
                Neighborhood Sustainability Hub
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} NHS. Built for sustainable
              communities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

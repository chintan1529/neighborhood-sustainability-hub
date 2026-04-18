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
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">NHS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </a>
            <a
              href="#impact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Impact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-all shadow-soft hover:shadow-elevated"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 relative overflow-hidden">
        {/* Subtle background shapes */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in inline-flex items-center gap-2 bg-primary/8 border border-primary/15 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Recycle className="h-4 w-4" />
              Sustainable Communities Start Here
            </div>
            <h1 className="animate-slide-up text-5xl md:text-7xl font-extrabold text-foreground mb-6 tracking-tight leading-[1.1]">
              Transform Your Neighborhood&apos;s{" "}
              <span className="text-primary">Waste Management</span>
            </h1>
            <p className="animate-slide-up delay-1 text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Report waste in 15 seconds, earn rewards, and track your
              community&apos;s environmental impact. AI-powered classification
              meets hyperlocal action.
            </p>
            <div className="animate-slide-up delay-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-foreground text-background px-8 py-3.5 text-lg font-semibold hover:bg-foreground/90 transition-all shadow-elevated hover:shadow-lg hover:-translate-y-0.5"
              >
                Start Reporting
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border-2 border-border px-8 py-3.5 text-lg font-semibold text-foreground hover:bg-muted/50 transition-all"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Hero Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
            {[
              {
                value: "10K+",
                label: "Reports Filed",
                accent: "border-l-emerald-500",
              },
              {
                value: "95%",
                label: "SLA Compliance",
                accent: "border-l-blue-500",
              },
              {
                value: "500+",
                label: "Active Users",
                accent: "border-l-amber-500",
              },
              {
                value: "24h",
                label: "Avg Resolution",
                accent: "border-l-purple-500",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`animate-slide-up delay-${i + 1} border-l-4 ${stat.accent} bg-card rounded-xl p-6 shadow-soft hover:shadow-elevated transition-all hover:-translate-y-0.5`}
              >
                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3">
              Features
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI-powered classification to real-time tracking, we&apos;ve
              got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MapPin,
                title: "Location-Based Reporting",
                description:
                  "Pin exact locations on the map for precise waste identification and faster resolution.",
                color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
              },
              {
                icon: Camera,
                title: "AI Classification",
                description:
                  "Automatic waste categorization using AI. 7 categories: Plastic, Paper, Metal, Glass, Cardboard, Organic, Mixed.",
                color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
              },
              {
                icon: Trophy,
                title: "Gamification & Rewards",
                description:
                  "Earn points, unlock badges, climb leaderboards, and participate in community challenges.",
                color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
              },
              {
                icon: Users,
                title: "Community Driven",
                description:
                  "Connect with your neighborhood, compete on leaderboards, and celebrate collective impact.",
                color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40",
              },
              {
                icon: BarChart3,
                title: "Admin Dashboard",
                description:
                  "Real-time analytics, SLA monitoring, and one-click municipal compliance reports.",
                color: "text-red-600 bg-red-50 dark:bg-red-950/40",
              },
              {
                icon: Shield,
                title: "SDG Aligned",
                description:
                  "Track your contribution to UN Sustainable Development Goals 11.6 and 12.5.",
                color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group p-7 rounded-2xl border border-border/60 bg-card shadow-subtle hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.color} mb-5 transition-transform group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 tracking-tight">
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
      <section id="how-it-works" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Report Waste in 15 Seconds
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to a cleaner neighborhood.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-0 max-w-5xl mx-auto relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px bg-border" />

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
                <div key={item.step} className="relative text-center p-8">
                  <div className="relative z-10 inline-flex items-center justify-center w-14 h-14 rounded-full bg-foreground text-background text-lg font-bold mb-6 shadow-elevated">
                    {item.step}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 tracking-tight">
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
      <section id="impact" className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3">
              Impact
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Aligned with UN SDGs
            </h2>
            <p className="text-lg text-background/60 max-w-2xl mx-auto">
              Every report contributes to global sustainability targets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="border border-background/10 rounded-2xl p-8 hover:bg-background/5 transition-colors">
              <div className="inline-flex items-center gap-2 bg-background/10 px-3 py-1.5 rounded-full text-sm font-medium mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                SDG 11.6
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">
                Sustainable Cities
              </h3>
              <p className="text-background/65 leading-relaxed">
                Reduce the adverse per capita environmental impact of cities by
                paying special attention to municipal waste management.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-background/50">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Waste
                  tracking
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Urban
                  cleanup
                </div>
              </div>
            </div>
            <div className="border border-background/10 rounded-2xl p-8 hover:bg-background/5 transition-colors">
              <div className="inline-flex items-center gap-2 bg-background/10 px-3 py-1.5 rounded-full text-sm font-medium mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                SDG 12.5
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">
                Responsible Consumption
              </h3>
              <p className="text-background/65 leading-relaxed">
                Substantially reduce waste generation through prevention,
                reduction, recycling, and reuse.
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-background/50">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> AI sorting
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Recycling
                  guides
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Ready to Make a Difference?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              Join thousands of residents building cleaner, more sustainable
              neighborhoods.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-foreground text-background px-8 py-4 text-lg font-semibold hover:bg-foreground/90 transition-all shadow-elevated hover:shadow-lg hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm">
                Neighborhood Sustainability Hub
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} NHS. Built for sustainable
              communities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

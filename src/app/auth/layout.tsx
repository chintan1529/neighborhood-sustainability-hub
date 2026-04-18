import Link from "next/link";
import { Leaf, Recycle, MapPin, Trophy } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left Panel — Branding */}
      <div className="relative hidden h-full flex-col bg-foreground p-10 text-background lg:flex dark:border-r overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 -right-16 w-64 h-64 rounded-full border border-background/10" />
        <div className="absolute top-32 -right-8 w-48 h-48 rounded-full border border-background/5" />
        <div className="absolute -bottom-20 -left-16 w-80 h-80 rounded-full border border-background/8" />
        <div className="absolute bottom-40 left-20 w-24 h-24 rounded-full border border-background/10" />

        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Logo */}
        <div className="relative z-20 flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">NHS</span>
          </Link>
        </div>

        {/* Features List */}
        <div className="relative z-20 mt-auto space-y-10">
          <div className="space-y-6">
            {[
              { icon: Recycle, label: "AI-powered waste classification" },
              { icon: MapPin, label: "Location-based reporting" },
              { icon: Trophy, label: "Gamified community engagement" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-background/70" />
                  </div>
                  <span className="text-sm text-background/70">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <blockquote className="border-l-2 border-primary pl-4">
            <p className="text-sm text-background/70 leading-relaxed italic">
              &ldquo;This platform has completely transformed how our
              neighborhood manages waste. The AI classification is like magic,
              and earning rewards makes it fun!&rdquo;
            </p>
            <footer className="text-xs text-background/40 mt-2">
              — Community Member
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="lg:p-8 flex items-center justify-center p-6 lg:ml-auto w-full max-w-2xl bg-white dark:bg-slate-950/50">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

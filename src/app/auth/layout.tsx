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
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Logo */}
        <div className="relative z-20 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-background/10 flex items-center justify-center">
              <Leaf className="h-3.5 w-3.5 text-background/70" />
            </div>
            <span className="font-semibold text-sm tracking-tight">NHS</span>
          </Link>
        </div>

        {/* Features List */}
        <div className="relative z-20 mt-auto space-y-8">
          <div className="space-y-5">
            {[
              { icon: Recycle, label: "AI-powered waste classification" },
              { icon: MapPin, label: "Location-based reporting" },
              { icon: Trophy, label: "Gamified community engagement" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-background/60" />
                  </div>
                  <span className="text-sm text-background/60">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <blockquote className="border-l-2 border-background/20 pl-4">
            <p className="text-sm text-background/60 leading-relaxed italic">
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
      <div className="lg:p-8 flex items-center justify-center p-6 lg:ml-auto w-full max-w-2xl">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

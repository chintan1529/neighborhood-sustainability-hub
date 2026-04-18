import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, Truck, Store, ArrowRight, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function SignupSelectorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already logged in, redirect to respective dashboard
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      if (profile.role === "admin") redirect("/admin");
      if (profile.role === "collector") redirect("/collector");
      if (profile.role === "recycler") redirect("/recycler");
      redirect("/resident");
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="w-full max-w-md mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Join the Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose your account type to continue
          </p>
        </div>

        {/* Cards Stack */}
        <div className="flex flex-col gap-4">
          
          {/* Resident Card */}
          <Link href="/auth/signup/resident" className="group outline-none w-full">
            <Card className="relative overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all duration-300 border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 group-focus-visible:ring-2 group-focus-visible:ring-emerald-500 rounded-xl cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">Resident</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mt-0.5">
                    Report waste, earn rewards & sell recyclables
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>

          {/* Collector Card */}
          <Link href="/auth/signup/collector" className="group outline-none w-full">
            <Card className="relative overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all duration-300 border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 group-focus-visible:ring-2 group-focus-visible:ring-blue-500 rounded-xl cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Truck className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">Collector</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mt-0.5">
                    Manage cleanup jobs & optimize routes
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>

          {/* Recycler Card */}
          <Link href="/auth/signup/recycler" className="group outline-none w-full">
            <Card className="relative overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all duration-300 border-2 border-slate-100 dark:border-slate-800 hover:border-teal-500 group-focus-visible:ring-2 group-focus-visible:ring-teal-500 rounded-xl cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 flex-shrink-0 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Store className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">Recycler</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mt-0.5">
                    Buy market materials & schedule pickups
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>

        </div>

        {/* Footer actions */}
        <div className="text-center pt-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-slate-900 dark:text-white hover:underline underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
} from "lucide-react";

export default async function RecyclerTransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login/recycler");

  const { data: transactions, error } = await (supabase as any)
    .from("marketplace_transactions")
    .select(
      `
            *,
            listing:marketplace_listings(title, category, weight_kg),
            resident:profiles!marketplace_transactions_resident_id_fkey(full_name)
        `,
    )
    .eq("recycler_id", user.id)
    .order("created_at", { ascending: false });

  if (error) console.error("Error fetching transactions:", error);

  const completedTotal =
    transactions
      ?.filter((t: any) => t.status === "completed")
      .reduce(
        (sum: number, t: any) => sum + (t.total_estimated_price || 0),
        0,
      ) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      case "confirmed":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case "picked_up":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            <Clock className="w-3 h-3 mr-1" />
            Picked Up
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="w-8 h-8 text-teal-600" /> Transaction History
        </h2>
        <p className="text-muted-foreground">
          Complete record of all your marketplace transactions.
        </p>
      </div>

      {/* Summary Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-950/20 dark:to-green-950/20 border-teal-200 dark:border-teal-900">
          <CardContent className="pt-6">
            <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">
              Total Transactions
            </p>
            <p className="text-3xl font-bold">{transactions?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900">
          <CardContent className="pt-6">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Completed
            </p>
            <p className="text-3xl font-bold">
              {transactions?.filter((t: any) => t.status === "completed")
                .length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-900">
          <CardContent className="pt-6">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Total Earnings
            </p>
            <p className="text-3xl font-bold flex items-center">
              <IndianRupee className="w-6 h-6" />
              {Math.round(completedTotal).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions?.length ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                No transactions yet. Start by making offers in the marketplace.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex flex-col sm:flex-row justify-between sm:items-center bg-muted/20 border rounded-lg p-4 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold truncate">
                        {tx.listing?.title || "Unknown"}
                      </h4>
                      {getStatusBadge(tx.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tx.listing?.category} · {tx.listing?.weight_kg}kg ·
                      Resident: {tx.resident?.full_name || "N/A"} ·
                      {new Date(tx.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg text-teal-600">
                      ₹{Math.round(tx.total_estimated_price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{tx.final_price_per_kg}/kg · {tx.payment_mode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight } from 'lucide-react';
import MapLoader from '@/components/marketplace/map-loader';


export default async function AdminMarketplacePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if ((profile as any)?.role !== 'admin') redirect('/');

    // Fetch all marketplace listings globally
    const { data: listings } = await (supabase as any)
        .from('marketplace_listings')
        .select(`
            id,
            title,
            category,
            status,
            weight_kg,
            expected_price,
            created_at,
            resident:profiles!resident_id(full_name),
            offers:marketplace_offers(count)
        `)
        .order('created_at', { ascending: false });

    const getStatusVariant = (status: string) => {
        if (status === 'active') return 'default';
        if (status === 'completed') return 'outline';
        return 'secondary';
    };

    return (
        <div className="container max-w-6xl py-8 space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Marketplace Oversight</h1>
                <p className="text-muted-foreground mt-1">Monitor all active and historical waste trades happening in the neighborhood.</p>
            </div>

            <div className="mb-8">
                <MapLoader listings={listings || []} height="350px" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(listings || []).map((listing: any) => (
                    <Card key={listing.id} className="relative overflow-hidden group">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline" className="capitalize">{listing.category}</Badge>
                                <Badge variant={getStatusVariant(listing.status) as any} className="capitalize">
                                    {listing.status}
                                </Badge>
                            </div>
                            <CardTitle className="text-lg line-clamp-1">{listing.title}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                Seller: {listing.resident?.full_name || 'Unknown'}
                            </p>
                        </CardHeader>
                        <CardContent className="pt-4 flex justify-between items-center text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="w-4 h-4" /> {listing.weight_kg} kg
                            </div>
                            <div className="font-medium text-right">
                                {listing.expected_price ? `₹${listing.expected_price}/kg` : 'Open Bid'}
                            </div>
                        </CardContent>
                        <div className="p-4 border-t bg-muted/10 flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                                {listing.offers?.[0]?.count || 0} Offers
                            </span>
                            <span className="text-blue-600 font-medium flex items-center hover:underline cursor-pointer">
                                Audit <ArrowRight className="w-3 h-3 ml-1" />
                            </span>
                        </div>
                    </Card>
                ))}
            </div>
            
            {(!listings || listings.length === 0) && (
                <div className="text-center py-24 text-muted-foreground bg-muted/20 rounded-xl border-dashed border-2">
                    No marketplace listings have been created yet.
                </div>
            )}
        </div>
    );
}

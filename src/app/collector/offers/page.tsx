import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Store, Tag, Clock, Calendar, Navigation } from 'lucide-react';

export default async function CollectorOffersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    // Verify Recycler
    const { data: profile } = await supabase
        .from('recycler_profiles')
        .select('verification_status')
        .eq('id', user.id)
        .single();

    if (!profile || profile.verification_status !== 'approved') {
        redirect('/collector/marketplace');
    }

    const { data: offers, error } = await supabase
        .from('marketplace_offers')
        .select(`
            *,
            listing:marketplace_listings (
                id,
                title,
                category,
                weight_kg,
                address_text,
                status,
                resident:profiles(full_name, avatar_url)
            )
        `)
        .eq('recycler_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching offers:', error);
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            case 'withdrawn': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Tag className="w-8 h-8 text-green-600" /> My Offers
                </h2>
                <p className="text-muted-foreground">
                    Track the status of your Blind Bids submitted to the marketplace.
                </p>
            </div>

            <Card className="shadow-xl shadow-green-900/5">
                <CardHeader>
                    <CardTitle>Recent Bids</CardTitle>
                    <CardDescription>
                        Offers are hidden from competitors until the resident makes a decision.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!offers || offers.length === 0 ? (
                        <div className="text-center py-16">
                            <Store className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold">No Active Offers</h3>
                            <p className="text-muted-foreground mb-4">You haven't placed any bids recently.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {offers.map((offer: any) => {
                                const listing = offer.listing;
                                return (
                                    <div
                                        key={offer.id}
                                        className="flex flex-col md:flex-row justify-between md:items-center bg-card border rounded-lg p-4 md:p-6 gap-4"
                                    >
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="capitalize text-xs font-semibold">
                                                    {listing?.category || 'Unknown'}
                                                </Badge>
                                                <Badge variant="outline" className={getStatusColor(offer.status)}>
                                                    Offer: {offer.status.toUpperCase()}
                                                </Badge>

                                                {listing?.status === 'accepted' && offer.status !== 'accepted' && (
                                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                                        Listing Closed
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-bold text-lg">{listing?.title || 'Listing Unavailable'}</h3>
                                                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Navigation className="w-3.5 h-3.5" /> {listing?.weight_kg} kg
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" /> {formatDate(offer.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-muted/30 p-4 rounded-lg min-w-[200px] border">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Your Bid</span>
                                                    <span className="font-bold text-green-600 text-lg">₹{offer.price_offered} <span className="text-xs text-muted-foreground">/kg</span></span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Pickup</span>
                                                    <span className="text-sm font-semibold flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-muted-foreground" />
                                                        {new Date(offer.proposed_pickup_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

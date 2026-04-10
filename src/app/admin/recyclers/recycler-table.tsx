'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { verifyRecycler } from '@/app/actions/marketplace';
import { Check, X, ShieldAlert, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export default function RecyclerTable({ recyclers }: { recyclers: any[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleVerify = async (id: string, newStatus: Exclude<VerificationStatus, 'pending'>) => {
        setProcessingId(id);
        const res = await verifyRecycler(id, newStatus);
        setProcessingId(null);

        if (res.success) {
            toast({
                title: 'Action Successful',
                description: `Recycler profile has been marked as ${newStatus}.`,
            });
            router.refresh(); // Sync server state
        } else {
            toast({
                title: 'Action Failed',
                description: res.error,
                variant: 'destructive',
            });
        }
    };

    const getStatusBadge = (status: VerificationStatus) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
            case 'approved': return <Badge variant="outline" className="text-green-600 border-green-600">Verified</Badge>;
            case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
            case 'suspended': return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Suspended</Badge>;
        }
    };

    const filtered = recyclers.filter(r => 
        r.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search business names or Tax IDs..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                    Total Network: {recyclers.length}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Business Info</th>
                            <th className="px-6 py-4 font-semibold">Contact</th>
                            <th className="px-6 py-4 font-semibold">Metrics</th>
                            <th className="px-6 py-4 font-semibold text-center">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 dark:text-slate-300">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                    No recyclers match your query.
                                </td>
                            </tr>
                        ) : filtered.map((recycler) => (
                            <tr key={recycler.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-semibold text-md text-foreground">{recycler.business_name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        Tax ID: <span className="font-mono">{recycler.tax_id || 'N/A'}</span>
                                    </div>
                                    <div className="text-xs mt-1 space-x-1">
                                        {recycler.accepted_categories?.slice(0, 3).map((cat: string) => (
                                            <span key={cat} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                                {cat}
                                            </span>
                                        ))}
                                        {recycler.accepted_categories?.length > 3 && <span className="text-[10px]">+{recycler.accepted_categories.length - 3}</span>}
                                    </div>
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium">{recycler.profiles?.full_name || 'No Name'}</div>
                                    <div className="text-muted-foreground">{recycler.profiles?.phone || 'No Phone'}</div>
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-500 font-bold">★{recycler.total_rating.toFixed(1)}</span>
                                        <span className="text-xs text-muted-foreground">({recycler.review_count})</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{recycler.service_radius_km}km Radius</p>
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {getStatusBadge(recycler.verification_status as VerificationStatus)}
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    {processingId === recycler.id ? (
                                        <div className="flex justify-end gap-2 pr-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            {recycler.verification_status !== 'approved' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                                    onClick={() => handleVerify(recycler.id, 'approved')}
                                                >
                                                    <Check className="w-4 h-4 mr-1" /> Approve
                                                </Button>
                                            )}
                                            
                                            {recycler.verification_status === 'pending' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                    onClick={() => handleVerify(recycler.id, 'rejected')}
                                                >
                                                    <X className="w-4 h-4 mr-1" /> Reject
                                                </Button>
                                            )}

                                            {recycler.verification_status === 'approved' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                                                    onClick={() => handleVerify(recycler.id, 'suspended')}
                                                >
                                                    <ShieldAlert className="w-4 h-4 mr-1" /> Suspend
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

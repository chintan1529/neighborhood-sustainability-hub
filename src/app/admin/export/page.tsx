'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, FileSpreadsheet, Users, FileText, Trophy, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ExportType = 'reports' | 'users' | 'challenges' | 'badges';

export default function AdminExportPage() {
    const [isExporting, setIsExporting] = useState<ExportType | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const { toast } = useToast();
    const supabase = createClient();

    const downloadCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Data',
                description: 'No data available to export.',
            });
            return;
        }

        // Get headers from first object
        const headers = Object.keys(data[0]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Handle values with commas, quotes, or newlines
                    if (value === null || value === undefined) return '';
                    const stringValue = String(value);
                    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                }).join(',')
            )
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        toast({
            title: 'Export Complete',
            description: `Successfully exported ${data.length} records to ${filename}.csv`,
        });
    };

    const exportReports = async () => {
        setIsExporting('reports');
        try {
            let query = supabase
                .from('waste_reports')
                .select('id, status, predicted_class, confirmed_class, address_text, latitude, longitude, quantity_estimate, notes, created_at, updated_at');

            if (dateFrom) {
                query = query.gte('created_at', dateFrom);
            }
            if (dateTo) {
                query = query.lte('created_at', dateTo);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            downloadCSV(data || [], 'waste_reports');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: error.message,
            });
        } finally {
            setIsExporting(null);
        }
    };

    const exportUsers = async () => {
        setIsExporting('users');
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role, total_points, reports_count, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            downloadCSV(data || [], 'users');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: error.message,
            });
        } finally {
            setIsExporting(null);
        }
    };

    const exportChallenges = async () => {
        setIsExporting('challenges');
        try {
            const { data, error } = await supabase
                .from('challenges')
                .select('id, title, description, type, status, target_count, reward_points, starts_at, ends_at, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            downloadCSV(data || [], 'challenges');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: error.message,
            });
        } finally {
            setIsExporting(null);
        }
    };

    const exportBadges = async () => {
        setIsExporting('badges');
        try {
            const { data, error } = await supabase
                .from('user_badges')
                .select('id, user_id, badge_id, awarded_at')
                .order('awarded_at', { ascending: false });

            if (error) throw error;
            downloadCSV(data || [], 'badge_awards');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: error.message,
            });
        } finally {
            setIsExporting(null);
        }
    };

    const exportOptions = [
        {
            id: 'reports' as ExportType,
            title: 'Waste Reports',
            description: 'Export all waste reports with location and status data',
            icon: FileText,
            action: exportReports,
            color: 'text-blue-600',
        },
        {
            id: 'users' as ExportType,
            title: 'Users',
            description: 'Export all user profiles with points and activity stats',
            icon: Users,
            action: exportUsers,
            color: 'text-green-600',
        },
        {
            id: 'challenges' as ExportType,
            title: 'Challenges',
            description: 'Export all challenge definitions and their settings',
            icon: Trophy,
            action: exportChallenges,
            color: 'text-amber-600',
        },
        {
            id: 'badges' as ExportType,
            title: 'Badge Awards',
            description: 'Export all badge awards with user and date information',
            icon: FileSpreadsheet,
            action: exportBadges,
            color: 'text-purple-600',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Data Export</h2>
                <p className="text-muted-foreground">Export your data to CSV files for analysis</p>
            </div>

            {/* Date Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Date Range Filter</CardTitle>
                    <CardDescription>Optional: Filter exports by date range (applies to Reports)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dateFrom">From</Label>
                            <Input
                                id="dateFrom"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dateTo">To</Label>
                            <Input
                                id="dateTo"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        {(dateFrom || dateTo) && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setDateFrom('');
                                    setDateTo('');
                                }}
                                className="mt-6"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Export Options Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {exportOptions.map((option) => (
                    <Card key={option.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-muted ${option.color}`}>
                                    <option.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{option.title}</CardTitle>
                                    <CardDescription>{option.description}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={option.action}
                                disabled={isExporting !== null}
                                className="w-full"
                            >
                                {isExporting === option.id ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export to CSV
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

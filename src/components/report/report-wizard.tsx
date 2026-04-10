'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, UploadCloud, Locate } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Map from '@/components/ui/map';
import { WASTE_CATEGORIES } from '@/lib/constants';
import { compressImage } from '@/lib/utils';


const steps = ['Photo', 'Classification', 'Location', 'Details', 'Review'];

const formSchema = z.object({
    photo: z.any().refine((files) => files?.length > 0, 'Photo is required'),
    category: z.string().min(1, 'Category is required'),
    latitude: z.number(),
    longitude: z.number(),
    notes: z.string().optional(),
    address: z.string().optional(),
});

export function ReportWizard() {
    const [step, setStep] = useState(0);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isClassifying, setIsClassifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confidence, setConfidence] = useState<number | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);

    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            category: '',
            latitude: 12.9716, // Default Bangalore
            longitude: 77.5946,
            notes: '',
            address: '',
        },
    });

    // Step 1: Photo Handling
    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            form.setValue('photo', e.target.files);
            setStep(1);
            // Auto-trigger AI classification
            classifyImage(file);
        }
    };

    // Step 2: Classification Logic (with Fallback)
    const classifyImage = async (file: File) => {
        setIsClassifying(true);
        try {
            const compressedBlob = await compressImage(file, 800);
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];

                // Call our Next.js API route for classification
                const response = await fetch('/api/classify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64data }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Classification request failed');
                }

                if (!data.ai_available || !data.predicted_class) {
                    toast({
                        title: 'AI Service Unavailable',
                        description: data.message || 'Please select the waste category manually.',
                    });
                } else if (data.predicted_class) {
                    // Edge Function returns { predicted_class, confidence, ai_available }
                    const category = data.predicted_class;

                    if (WASTE_CATEGORIES[category as import('@/types/database').WasteCategory]) {
                        form.setValue('category', category);
                        setConfidence(data.confidence);
                        toast({
                            title: 'AI Classified!',
                            description: `Identified as ${WASTE_CATEGORIES[category as import('@/types/database').WasteCategory].label} (${Math.round(data.confidence * 100)}% confidence)`,
                        });
                    } else {
                        // Fallback if category not in our list
                        form.setValue('category', 'mixed');
                        toast({
                            title: 'AI Classified',
                            description: `Detected: ${category}. Please verify or select correctly.`,
                        });
                    }
                }
                setIsClassifying(false);
            };

            reader.readAsDataURL(compressedBlob);
        } catch (e) {
            console.error(e);
            setIsClassifying(false);
            toast({
                title: 'Classification Error',
                description: e instanceof Error ? e.message : 'Please select the waste category manually.',
            });
        }
    };
    // Step 3: Geolocation
    const getCurrentLocation = () => {
        setLocationLoading(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    form.setValue('latitude', position.coords.latitude);
                    form.setValue('longitude', position.coords.longitude);
                    setLocationLoading(false);
                    toast({ title: 'Location detected' });
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    toast({
                        variant: 'destructive',
                        title: 'Location detection failed',
                        description: 'Please pin your location manually on the map.'
                    });
                    setLocationLoading(false);
                }
            );
        } else {
            toast({
                variant: 'destructive',
                title: 'Not supported',
                description: 'Geolocation is not supported by your browser.'
            });
            setLocationLoading(false);
        }
    };

    // Submission Logic - Uses Server Action to bypass RLS
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            // Import the server action dynamically
            const { submitReport } = await import('@/app/resident/report/actions');

            // Convert photo to base64
            const file = values.photo[0];
            const reader = new FileReader();

            const photoBase64 = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const result = await submitReport({
                category: values.category,
                latitude: values.latitude,
                longitude: values.longitude,
                address: values.address,
                notes: values.notes,
                photoBase64,
                photoName: file.name
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            toast({
                title: 'Report Submitted!',
                description: 'You earned 10 points!',
            });

            if (result.unlockedBadges && result.unlockedBadges.length > 0) {
                // Wait before redirecting
                setTimeout(() => {
                    router.push('/resident');
                }, 4000);
            } else {
                router.push('/resident');
            }

        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: error.message || 'Please try again',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
    const prevStep = () => setStep((s) => Math.max(s - 1, 0));

    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress Steps */}
            <div className="flex justify-between mb-8">
                {steps.map((label, idx) => (
                    <div key={label} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= idx
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                            }`}>
                            {step > idx ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span className="text-xs mt-1 text-muted-foreground hidden sm:block">{label}</span>
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{steps[step]}</CardTitle>
                    <CardDescription>
                        Step {step + 1} of {steps.length}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Step 0: Photo */}
                            {step === 0 && (
                                <div className="flex flex-col items-center justify-center gap-6 py-8">
                                    <div
                                        className="w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition bg-muted/20 relative overflow-hidden"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {photoPreview ? (
                                            <Image
                                                src={photoPreview}
                                                alt="Preview"
                                                fill
                                                className="object-contain"
                                            />
                                        ) : (
                                            <>
                                                <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
                                                <p className="text-sm font-medium">Click to upload or take photo</p>
                                                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC up to 5MB</p>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handlePhotoSelect}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Classification */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    {isClassifying ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                            <p className="text-lg font-medium">Analyzing waste with AI...</p>
                                            <p className="text-sm text-muted-foreground">Identifying material type</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {photoPreview && (
                                                <div className="relative h-48 w-full rounded-lg overflow-hidden bg-black/5 mx-auto">
                                                    <Image src={photoPreview} alt="Preview" fill className="object-contain" />
                                                </div>
                                            )}

                                            <FormField
                                                control={form.control}
                                                name="category"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Waste Category</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select category" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {Object.entries(WASTE_CATEGORIES).map(([key, value]) => (
                                                                    <SelectItem key={key} value={key}>
                                                                        <span className="flex items-center gap-2">
                                                                            <span>{value.icon}</span>
                                                                            {value.label}
                                                                        </span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {confidence && field.value && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                AI Confidence: {Math.round(confidence * 100)}%
                                                            </p>
                                                        )}
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Location */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} disabled={locationLoading}>
                                            {locationLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Locate className="h-4 w-4 mr-2" />}
                                            Use My Location
                                        </Button>
                                    </div>
                                    {/* Map Container with Explicit Height */}
                                    <div className="relative h-[400px] w-full border rounded-md overflow-hidden bg-muted">
                                        <Map
                                            center={[form.watch('latitude') || 12.9716, form.watch('longitude') || 77.5946]}
                                            onLocationSelect={(lat: number, lng: number) => {
                                                form.setValue('latitude', lat, { shouldValidate: true });
                                                form.setValue('longitude', lng, { shouldValidate: true });
                                            }}
                                            markerPosition={[form.watch('latitude'), form.watch('longitude')]}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">Tap map to refine pin location</p>
                                </div>
                            )}

                            {/* Step 3: Details */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address / Landmark</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Near Gate 1, Block B" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes (Optional)</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Any additional details for the collector..."
                                                        className="resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {/* Step 4: Review */}
                            {step === 4 && (
                                <div className="space-y-6">
                                    <div className="rounded-lg border p-4 space-y-4">
                                        <div className="flex items-start gap-4">
                                            {photoPreview && (
                                                <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted">
                                                    <Image src={photoPreview} alt="Waste" fill className="object-cover" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-lg capitalize">{form.getValues('category')}</p>
                                                <p className="text-sm text-muted-foreground">{form.getValues('address') || 'Pinned Location'}</p>
                                            </div>
                                        </div>
                                        {form.getValues('notes') && (
                                            <div className="text-sm bg-muted/50 p-3 rounded">
                                                "{form.getValues('notes')}"
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-nhs-green/10 p-4 rounded-lg flex items-center gap-3 text-nhs-green">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <div className="text-sm">
                                            <p className="font-medium">Ready to submit!</p>
                                            <p>You will earn 10 points for this report.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={step === 0 || isSubmitting}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>

                    {step < steps.length - 1 ? (
                        <Button
                            onClick={nextStep}
                            disabled={step === 0 && !photoPreview} // Can't proceed from photo without photo
                        >
                            Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            className="bg-nhs-green hover:bg-nhs-green/90"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Report
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

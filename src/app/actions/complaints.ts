'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function submitComplaint(formData: FormData) {
    const auth = await requireAuth();
    if (!auth.success) return { error: auth.error };

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('neighborhood_id')
        .eq('id', auth.data.user.id)
        .single();

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const priority = parseInt(formData.get('priority') as string) || 2;
    const address = formData.get('address') as string;
    const latStr = formData.get('latitude') as string | null;
    const lngStr = formData.get('longitude') as string | null;
    const latitude = latStr ? parseFloat(latStr) : null;
    const longitude = lngStr ? parseFloat(lngStr) : null;

    if (!title || !description || !category) {
        return { error: 'Title, description, and category are required.' };
    }

    const { error } = await supabase.from('complaints').insert({
        user_id: auth.data.user.id,
        neighborhood_id: profile?.neighborhood_id,
        title,
        description,
        category: category as import('@/types/database').ComplaintCategory,
        priority,
        address_text: address || null,
        latitude,
        longitude,
    });

    if (error) {
        console.error('Complaint submission error:', error);
        return { error: 'Failed to submit complaint. Please try again.' };
    }

    revalidatePath('/resident/complaints');
    return { success: true };
}

export async function updateComplaintStatus(
    complaintId: string,
    status: string,
    response?: string,
    resolutionNotes?: string
) {
    const auth = await requireAdmin();
    if (!auth.success) return { error: auth.error };

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
    };

    if (response) updateData.admin_response = response;
    if (resolutionNotes) updateData.resolution_notes = resolutionNotes;

    if (status === 'under_review' || status === 'in_progress') {
        updateData.assigned_to = auth.data.user.id;
        updateData.assigned_at = new Date().toISOString();
    }

    if (status === 'resolved' || status === 'rejected') {
        updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

    if (error) {
        console.error('Complaint update error:', error);
        return { error: 'Failed to update complaint.' };
    }

    revalidatePath('/admin/complaints');
    return { success: true };
}

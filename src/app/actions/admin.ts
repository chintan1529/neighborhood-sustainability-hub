'use server';

import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ─── Update user profile (admin only) ───
export async function updateUserProfile(formData: FormData) {
    const auth = await requireAdmin();
    if (!auth.success) return { error: auth.error };

    const userId = formData.get('userId') as string;
    const fullName = formData.get('fullName') as string;
    const role = formData.get('role') as string;

    if (!userId) {
        return { error: 'User ID is required' };
    }

    const updateData: Record<string, string> = {};
    if (fullName) updateData.full_name = fullName;
    if (role) updateData.role = role;

    const { error } = await auth.data.adminClient
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

    if (error) {
        console.error('Update user error:', error);
        return { error: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
}

// ─── Create a new challenge ───
export async function createChallenge(formData: FormData) {
    const auth = await requireAdmin();
    if (!auth.success) return { error: auth.error };

    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const targetCount = parseInt(formData.get('targetCount') as string) || 10;
    const rewardPoints = parseInt(formData.get('rewardPoints') as string) || 50;
    const startsAt = formData.get('startsAt') as string;
    const endsAt = formData.get('endsAt') as string;

    if (!title) {
        return { error: 'Title is required' };
    }

    const { data: newChallenge, error } = await auth.data.adminClient
        .from('challenges')
        .insert({
            title,
            description,
            type: 'weekly',
            status: 'draft',
            target_count: targetCount,
            reward_points: rewardPoints,
            starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
            ends_at: endsAt ? new Date(endsAt).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            neighborhood_id: auth.data.profile.neighborhood_id || null,
        })
        .select()
        .single();

    if (error) {
        console.error('Create challenge error:', error);
        return { error: error.message };
    }

    revalidatePath('/admin/challenges');
    return { success: true, data: newChallenge };
}

// ─── Update challenge status ───
export async function updateChallengeStatus(formData: FormData) {
    const auth = await requireAdmin();
    if (!auth.success) return { error: auth.error };

    const challengeId = formData.get('challengeId') as string;
    const status = formData.get('status') as string;

    if (!challengeId || !status) {
        return { error: 'Challenge ID and status are required' };
    }

    const { error } = await auth.data.adminClient
        .from('challenges')
        .update({ status: status as import('@/types/database').ChallengeStatus })
        .eq('id', challengeId);

    if (error) {
        console.error('Update challenge error:', error);
        return { error: error.message };
    }

    revalidatePath('/admin/challenges');
    return { success: true };
}

// ─── Delete challenge ───
export async function deleteChallenge(formData: FormData) {
    const auth = await requireAdmin();
    if (!auth.success) return { error: auth.error };

    const challengeId = formData.get('challengeId') as string;

    if (!challengeId) {
        return { error: 'Challenge ID is required' };
    }

    const { error } = await auth.data.adminClient
        .from('challenges')
        .delete()
        .eq('id', challengeId);

    if (error) {
        console.error('Delete challenge error:', error);
        return { error: error.message };
    }

    revalidatePath('/admin/challenges');
    return { success: true };
}

// ─── Create a new workshop ───
export async function createWorkshop(formData: FormData) {
    const auth = await requireAdmin();
    if (!auth.success) return { error: auth.error };

    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const shortDescription = (formData.get('shortDescription') as string) || '';
    const type = ((formData.get('type') as string) || 'workshop') as import('@/types/database').WorkshopType;
    const startsAt = formData.get('startsAt') as string;
    const endsAt = formData.get('endsAt') as string;
    const location = (formData.get('location') as string) || '';
    const locationType = ((formData.get('locationType') as string) || 'in-person') as import('@/types/database').LocationType;
    const maxParticipants = formData.get('maxParticipants') as string;
    const pointsReward = parseInt(formData.get('pointsReward') as string) || 50;
    const tags = (formData.get('tags') as string) || '';

    if (!title) {
        return { error: 'Title is required' };
    }
    if (!startsAt) {
        return { error: 'Start date is required' };
    }

    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const { data: newWorkshop, error } = await auth.data.adminClient
        .from('workshops')
        .insert({
            title,
            description,
            short_description: shortDescription,
            type,
            status: 'upcoming',
            starts_at: new Date(startsAt).toISOString(),
            ends_at: endsAt ? new Date(endsAt).toISOString() : null,
            location,
            location_type: locationType,
            max_participants: maxParticipants ? parseInt(maxParticipants) : null,
            points_reward: pointsReward,
            organizer_id: auth.data.user.id,
            neighborhood_id: auth.data.profile.neighborhood_id || null,
            tags: tagsArray,
        })
        .select()
        .single();

    if (error) {
        console.error('Create workshop error:', error);
        return { error: error.message };
    }

    revalidatePath('/admin/workshops');
    return { success: true, data: newWorkshop };
}

// ─── Update workshop status ───
export async function updateWorkshopStatus(formData: FormData) {
    const auth = await requireAdmin();
    if (!auth.success) return { error: auth.error };

    const workshopId = formData.get('workshopId') as string;
    const status = formData.get('status') as string;

    if (!workshopId || !status) {
        return { error: 'Workshop ID and status are required' };
    }

    const { error } = await auth.data.adminClient
        .from('workshops')
        .update({ status: status as import('@/types/database').WorkshopStatus, updated_at: new Date().toISOString() })
        .eq('id', workshopId);

    if (error) {
        console.error('Update workshop error:', error);
        return { error: error.message };
    }

    revalidatePath('/admin/workshops');
    return { success: true };
}

// ─── Delete workshop ───
export async function deleteWorkshop(formData: FormData) {
    const auth = await requireAdmin();
    if (!auth.success) return { error: auth.error };

    const workshopId = formData.get('workshopId') as string;

    if (!workshopId) {
        return { error: 'Workshop ID is required' };
    }

    const { error } = await auth.data.adminClient
        .from('workshops')
        .delete()
        .eq('id', workshopId);

    if (error) {
        console.error('Delete workshop error:', error);
        return { error: error.message };
    }

    revalidatePath('/admin/workshops');
    return { success: true };
}

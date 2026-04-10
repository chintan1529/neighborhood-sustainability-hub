export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ────────────────────────────────────────────────────────────────────
export type UserRole = 'resident' | 'collector' | 'admin'
export type WasteCategory =
  | 'cardboard'
  | 'metal'
  | 'paper'
  | 'plastic'
  | 'glass'
  | 'organic'
  | 'mixed'
export type ReportStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
export type PointsReason =
  | 'report_created'
  | 'correct_segregation'
  | 'streak_bonus'
  | 'challenge_completed'
  | 'badge_earned'
  | 'admin_adjustment'
  | 'referral_bonus'
export type ChallengeType = 'weekly' | 'monthly' | 'special'
export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type WorkshopType = 'workshop' | 'campaign' | 'training' | 'event'
export type LocationType = 'in-person' | 'online' | 'hybrid'
export type WorkshopStatus =
  | 'draft'
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
export type RegistrationStatus = 'registered' | 'attended' | 'cancelled' | 'no_show'
export type NotificationType =
  | 'report_status'
  | 'message'
  | 'workshop'
  | 'challenge'
  | 'points'
  | 'badge'
  | 'system'
  | 'new_offer'
  | 'offer_accepted'
  | 'pickup_scheduled'
  | 'transaction_completed'
export type ConversationType = 'direct' | 'report' | 'support'
export type ComplaintCategory =
  | 'missed_pickup'
  | 'illegal_dumping'
  | 'overflowing_bin'
  | 'service_quality'
  | 'damaged_bin'
  | 'noise_complaint'
  | 'hazardous_waste'
  | 'other'
export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
export type ListingStatus =
  | 'active'
  | 'negotiating'
  | 'accepted'
  | 'picked_up'
  | 'completed'
  | 'cancelled'
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type TransactionStatus = 'confirmed' | 'picked_up' | 'completed' | 'cancelled'
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer'
export type PaymentStatus = 'pending' | 'completed'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// ── Convenience interfaces ────────────────────────────────────────────────────

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  reference_id: string | null
  reference_type: string | null
  action_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface NotificationPreferences {
  user_id: string
  in_app_enabled: boolean
  email_enabled: boolean
  push_enabled: boolean
  report_updates: boolean
  messages: boolean
  workshops: boolean
  challenges: boolean
  points_updates: boolean
  badge_earned: boolean
  system_updates: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  updated_at: string
}

export interface Workshop {
  id: string
  title: string
  description: string | null
  short_description: string | null
  type: WorkshopType
  status: WorkshopStatus
  starts_at: string
  ends_at: string | null
  location: string | null
  location_type: LocationType
  max_participants: number | null
  points_reward: number
  neighborhood_id: string | null
  image_url: string | null
  organizer_id: string | null
  requirements: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

export interface Complaint {
  id: string
  user_id: string
  neighborhood_id: string | null
  category: ComplaintCategory
  status: ComplaintStatus
  priority: number
  title: string
  description: string
  latitude: number | null
  longitude: number | null
  address_text: string | null
  photo_url: string | null
  photo_path: string | null
  assigned_to: string | null
  assigned_at: string | null
  admin_response: string | null
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  profiles?: { full_name: string | null }
  assigned_profile?: { full_name: string | null } | null
}

export interface TransferStation {
  id: string
  name: string
  code: string | null
  latitude: number
  longitude: number
  address_text: string | null
  capacity_tons: number
  current_load_tons: number
  operating_hours: string
  waste_types_accepted: string[]
  is_active: boolean
  contact_phone: string | null
  contact_email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AreaRiskZone {
  zone_id: string
  risk_score: number
  risk_level: RiskLevel
  report_count: number
  unresolved_count: number
  dominant_category: WasteCategory | null
  severity_index: number
  last_cleanup_at: string | null
  last_report_at: string | null
  latitude: number | null
  longitude: number | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface GovernmentBenchmark {
  id: string
  city: string
  state: string
  cleanliness_rank: number | null
  cleanliness_score: number | null
  waste_processed_tpd: number | null
  door_to_door_coverage_pct: number | null
  source_segregation_pct: number | null
  population_lakhs: number | null
  survey_year: number
  survey_source: string
  created_at: string
}

export interface RiskScoringConfig {
  id: string
  weight_density: number
  weight_severity: number
  weight_recency: number
  weight_unresolved: number
  severity_plastic: number
  severity_hazardous: number
  severity_metal: number
  severity_glass: number
  severity_cardboard: number
  severity_paper: number
  severity_organic: number
  severity_mixed: number
  is_active: boolean
  updated_at: string
}

// ── Database (Supabase generated-compatible format) ───────────────────────────

export interface Database {
  public: {
    Tables: {
      neighborhoods: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          address: string | null
          city: string
          state: string
          pincode: string | null
          latitude: number | null
          longitude: number | null
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          address?: string | null
          city?: string
          state?: string
          pincode?: string | null
          latitude?: number | null
          longitude?: number | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          address?: string | null
          city?: string
          state?: string
          pincode?: string | null
          latitude?: number | null
          longitude?: number | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          neighborhood_id: string | null
          role: UserRole
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          total_points: number
          current_streak: number
          longest_streak: number
          last_report_date: string | null
          reports_count: number
          is_available: boolean
          active_claim_id: string | null
          notification_preferences: Json
          is_verified: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          neighborhood_id?: string | null
          role?: UserRole
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          total_points?: number
          current_streak?: number
          longest_streak?: number
          last_report_date?: string | null
          reports_count?: number
          is_available?: boolean
          active_claim_id?: string | null
          notification_preferences?: Json
          is_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          neighborhood_id?: string | null
          role?: UserRole
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          total_points?: number
          current_streak?: number
          longest_streak?: number
          last_report_date?: string | null
          reports_count?: number
          is_available?: boolean
          active_claim_id?: string | null
          notification_preferences?: Json
          is_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      waste_reports: {
        Row: {
          id: string
          user_id: string
          neighborhood_id: string
          status: ReportStatus
          predicted_class: WasteCategory | null
          confirmed_class: WasteCategory | null
          prediction_confidence: number | null
          ai_available: boolean
          photo_url: string
          photo_path: string | null
          completion_photo_url: string | null
          completion_photo_path: string | null
          latitude: number
          longitude: number
          address_text: string | null
          landmark: string | null
          notes: string | null
          quantity_estimate: string | null
          assigned_to: string | null
          assigned_at: string | null
          completed_at: string | null
          completion_notes: string | null
          points_awarded: number
          idempotency_key: string | null
          metadata: Json
          collector_rating: number | null
          collector_review: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          neighborhood_id: string
          status?: ReportStatus
          predicted_class?: WasteCategory | null
          confirmed_class?: WasteCategory | null
          prediction_confidence?: number | null
          ai_available?: boolean
          photo_url: string
          photo_path?: string | null
          completion_photo_url?: string | null
          completion_photo_path?: string | null
          latitude: number
          longitude: number
          address_text?: string | null
          landmark?: string | null
          notes?: string | null
          quantity_estimate?: string | null
          assigned_to?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          points_awarded?: number
          idempotency_key?: string | null
          metadata?: Json
          collector_rating?: number | null
          collector_review?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          neighborhood_id?: string
          status?: ReportStatus
          predicted_class?: WasteCategory | null
          confirmed_class?: WasteCategory | null
          prediction_confidence?: number | null
          ai_available?: boolean
          photo_url?: string
          photo_path?: string | null
          completion_photo_url?: string | null
          completion_photo_path?: string | null
          latitude?: number
          longitude?: number
          address_text?: string | null
          landmark?: string | null
          notes?: string | null
          quantity_estimate?: string | null
          assigned_to?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          points_awarded?: number
          idempotency_key?: string | null
          metadata?: Json
          collector_rating?: number | null
          collector_review?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_events: {
        Row: {
          id: string
          report_id: string
          event_type: string
          previous_status: ReportStatus | null
          new_status: ReportStatus | null
          actor_id: string | null
          actor_role: UserRole | null
          notes: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          event_type: string
          previous_status?: ReportStatus | null
          new_status?: ReportStatus | null
          actor_id?: string | null
          actor_role?: UserRole | null
          notes?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          event_type?: string
          previous_status?: ReportStatus | null
          new_status?: ReportStatus | null
          actor_id?: string | null
          actor_role?: UserRole | null
          notes?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      collector_claims: {
        Row: {
          id: string
          report_id: string
          collector_id: string
          claimed_at: string
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          is_active: boolean
          cancellation_reason: string | null
          idempotency_key: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          collector_id: string
          claimed_at?: string
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          is_active?: boolean
          cancellation_reason?: string | null
          idempotency_key?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          collector_id?: string
          claimed_at?: string
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          is_active?: boolean
          cancellation_reason?: string | null
          idempotency_key?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          id: string
          user_id: string
          points: number
          reason: PointsReason
          description: string | null
          reference_id: string | null
          reference_type: string | null
          balance_after: number | null
          validated: boolean
          validation_notes: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points: number
          reason: PointsReason
          description?: string | null
          reference_id?: string | null
          reference_type?: string | null
          balance_after?: number | null
          validated?: boolean
          validation_notes?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          reason?: PointsReason
          description?: string | null
          reference_id?: string | null
          reference_type?: string | null
          balance_after?: number | null
          validated?: boolean
          validation_notes?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          neighborhood_id: string | null
          title: string
          description: string | null
          type: ChallengeType
          status: ChallengeStatus
          target_count: number
          target_category: WasteCategory | null
          reward_points: number
          reward_badge_id: string | null
          starts_at: string
          ends_at: string
          max_participants: number | null
          image_url: string | null
          sort_order: number
          rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          neighborhood_id?: string | null
          title: string
          description?: string | null
          type?: ChallengeType
          status?: ChallengeStatus
          target_count?: number
          target_category?: WasteCategory | null
          reward_points?: number
          reward_badge_id?: string | null
          starts_at: string
          ends_at: string
          max_participants?: number | null
          image_url?: string | null
          sort_order?: number
          rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          neighborhood_id?: string | null
          title?: string
          description?: string | null
          type?: ChallengeType
          status?: ChallengeStatus
          target_count?: number
          target_category?: WasteCategory | null
          reward_points?: number
          reward_badge_id?: string | null
          starts_at?: string
          ends_at?: string
          max_participants?: number | null
          image_url?: string | null
          sort_order?: number
          rules?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          current_count: number
          is_completed: boolean
          completed_at: string | null
          points_awarded: number
          badge_awarded: boolean
          joined_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          current_count?: number
          is_completed?: boolean
          completed_at?: string | null
          points_awarded?: number
          badge_awarded?: boolean
          joined_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          current_count?: number
          is_completed?: boolean
          completed_at?: string | null
          points_awarded?: number
          badge_awarded?: boolean
          joined_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon_url: string | null
          color: string
          requirements: Json
          points_reward: number
          tier: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon_url?: string | null
          color?: string
          requirements?: Json
          points_reward?: number
          tier?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon_url?: string | null
          color?: string
          requirements?: Json
          points_reward?: number
          tier?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          awarded_at: string
          awarded_by: string | null
          points_awarded: number
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          awarded_at?: string
          awarded_by?: string | null
          points_awarded?: number
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          awarded_at?: string
          awarded_by?: string | null
          points_awarded?: number
        }
        Relationships: []
      }
      workshops: {
        Row: {
          id: string
          title: string
          description: string | null
          short_description: string | null
          type: WorkshopType
          status: WorkshopStatus
          starts_at: string
          ends_at: string | null
          location: string | null
          location_type: LocationType
          max_participants: number | null
          points_reward: number
          neighborhood_id: string | null
          image_url: string | null
          organizer_id: string | null
          requirements: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          short_description?: string | null
          type: WorkshopType
          status?: WorkshopStatus
          starts_at: string
          ends_at?: string | null
          location?: string | null
          location_type?: LocationType
          max_participants?: number | null
          points_reward?: number
          neighborhood_id?: string | null
          image_url?: string | null
          organizer_id?: string | null
          requirements?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          short_description?: string | null
          type?: WorkshopType
          status?: WorkshopStatus
          starts_at?: string
          ends_at?: string | null
          location?: string | null
          location_type?: LocationType
          max_participants?: number | null
          points_reward?: number
          neighborhood_id?: string | null
          image_url?: string | null
          organizer_id?: string | null
          requirements?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workshop_registrations: {
        Row: {
          id: string
          workshop_id: string
          user_id: string
          status: RegistrationStatus
          registered_at: string
          attended_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          workshop_id: string
          user_id: string
          status?: RegistrationStatus
          registered_at?: string
          attended_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          workshop_id?: string
          user_id?: string
          status?: RegistrationStatus
          registered_at?: string
          attended_at?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          body: string | null
          reference_id: string | null
          reference_type: string | null
          action_url: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          body?: string | null
          reference_id?: string | null
          reference_type?: string | null
          action_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          body?: string | null
          reference_id?: string | null
          reference_type?: string | null
          action_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          user_id: string
          in_app_enabled: boolean
          email_enabled: boolean
          push_enabled: boolean
          report_updates: boolean
          messages: boolean
          workshops: boolean
          challenges: boolean
          points_updates: boolean
          badge_earned: boolean
          system_updates: boolean
          quiet_hours_enabled: boolean
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          in_app_enabled?: boolean
          email_enabled?: boolean
          push_enabled?: boolean
          report_updates?: boolean
          messages?: boolean
          workshops?: boolean
          challenges?: boolean
          points_updates?: boolean
          badge_earned?: boolean
          system_updates?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          in_app_enabled?: boolean
          email_enabled?: boolean
          push_enabled?: boolean
          report_updates?: boolean
          messages?: boolean
          workshops?: boolean
          challenges?: boolean
          points_updates?: boolean
          badge_earned?: boolean
          system_updates?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          type: ConversationType
          title: string | null
          reference_id: string | null
          reference_type: string | null
          created_at: string
          updated_at: string
          last_message_at: string
        }
        Insert: {
          id?: string
          type?: ConversationType
          title?: string | null
          reference_id?: string | null
          reference_type?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Update: {
          id?: string
          type?: ConversationType
          title?: string | null
          reference_id?: string | null
          reference_type?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: string
          joined_at: string
          last_read_at: string
          is_muted: boolean
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role?: string
          joined_at?: string
          last_read_at?: string
          is_muted?: boolean
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          last_read_at?: string
          is_muted?: boolean
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          message_type: string
          attachment_url: string | null
          is_edited: boolean
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          message_type?: string
          attachment_url?: string | null
          is_edited?: boolean
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          message_type?: string
          attachment_url?: string | null
          is_edited?: boolean
          edited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      transfer_stations: {
        Row: {
          id: string
          name: string
          code: string | null
          latitude: number
          longitude: number
          address_text: string | null
          capacity_tons: number
          current_load_tons: number
          operating_hours: string
          waste_types_accepted: string[]
          is_active: boolean
          contact_phone: string | null
          contact_email: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          latitude: number
          longitude: number
          address_text?: string | null
          capacity_tons?: number
          current_load_tons?: number
          operating_hours?: string
          waste_types_accepted?: string[]
          is_active?: boolean
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          latitude?: number
          longitude?: number
          address_text?: string | null
          capacity_tons?: number
          current_load_tons?: number
          operating_hours?: string
          waste_types_accepted?: string[]
          is_active?: boolean
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          id: string
          user_id: string
          neighborhood_id: string | null
          category: ComplaintCategory
          status: ComplaintStatus
          priority: number
          title: string
          description: string
          latitude: number | null
          longitude: number | null
          address_text: string | null
          photo_url: string | null
          photo_path: string | null
          assigned_to: string | null
          assigned_at: string | null
          admin_response: string | null
          resolution_notes: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          neighborhood_id?: string | null
          category: ComplaintCategory
          status?: ComplaintStatus
          priority?: number
          title: string
          description: string
          latitude?: number | null
          longitude?: number | null
          address_text?: string | null
          photo_url?: string | null
          photo_path?: string | null
          assigned_to?: string | null
          assigned_at?: string | null
          admin_response?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          neighborhood_id?: string | null
          category?: ComplaintCategory
          status?: ComplaintStatus
          priority?: number
          title?: string
          description?: string
          latitude?: number | null
          longitude?: number | null
          address_text?: string | null
          photo_url?: string | null
          photo_path?: string | null
          assigned_to?: string | null
          assigned_at?: string | null
          admin_response?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_weights: {
        Row: {
          id: string
          lat_grid: number
          lng_grid: number
          weight_multiplier: number
          total_predictions: number
          verified_predictions: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lat_grid: number
          lng_grid: number
          weight_multiplier?: number
          total_predictions?: number
          verified_predictions?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lat_grid?: number
          lng_grid?: number
          weight_multiplier?: number
          total_predictions?: number
          verified_predictions?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      predicted_reports: {
        Row: {
          id: string
          predicted_category: string
          base_confidence: number
          final_weight: number
          latitude: number
          longitude: number
          target_date: string
          status: string
          matched_report_id: string | null
          collector_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          predicted_category: string
          base_confidence: number
          final_weight: number
          latitude: number
          longitude: number
          target_date: string
          status?: string
          matched_report_id?: string | null
          collector_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          predicted_category?: string
          base_confidence?: number
          final_weight?: number
          latitude?: number
          longitude?: number
          target_date?: string
          status?: string
          matched_report_id?: string | null
          collector_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      recycler_profiles: {
        Row: {
          id: string
          business_name: string
          tax_id: string | null
          verification_status: VerificationStatus
          verified_at: string | null
          service_radius_km: number
          accepted_categories: WasteCategory[]
          base_location: unknown
          total_rating: number
          review_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          business_name: string
          tax_id?: string | null
          verification_status?: VerificationStatus
          verified_at?: string | null
          service_radius_km?: number
          accepted_categories?: WasteCategory[]
          base_location: unknown
          total_rating?: number
          review_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          tax_id?: string | null
          verification_status?: VerificationStatus
          verified_at?: string | null
          service_radius_km?: number
          accepted_categories?: WasteCategory[]
          base_location?: unknown
          total_rating?: number
          review_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          id: string
          resident_id: string
          category: WasteCategory
          weight_kg: number
          title: string
          description: string | null
          photos: string[]
          location: unknown
          address_text: string
          expected_price: number | null
          ai_suggested_price: number | null
          status: ListingStatus
          selected_offer_id: string | null
          fraud_flag: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          resident_id: string
          category: WasteCategory
          weight_kg: number
          title: string
          description?: string | null
          photos?: string[]
          location: unknown
          address_text: string
          expected_price?: number | null
          ai_suggested_price?: number | null
          status?: ListingStatus
          selected_offer_id?: string | null
          fraud_flag?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          resident_id?: string
          category?: WasteCategory
          weight_kg?: number
          title?: string
          description?: string | null
          photos?: string[]
          location?: unknown
          address_text?: string
          expected_price?: number | null
          ai_suggested_price?: number | null
          status?: ListingStatus
          selected_offer_id?: string | null
          fraud_flag?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_offers: {
        Row: {
          id: string
          listing_id: string
          recycler_id: string
          price_offered: number
          proposed_pickup_time: string
          status: OfferStatus
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          recycler_id: string
          price_offered: number
          proposed_pickup_time: string
          status?: OfferStatus
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          recycler_id?: string
          price_offered?: number
          proposed_pickup_time?: string
          status?: OfferStatus
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_transactions: {
        Row: {
          id: string
          listing_id: string
          offer_id: string
          resident_id: string
          recycler_id: string
          final_price_per_kg: number
          total_estimated_price: number
          scheduled_pickup_time: string
          status: TransactionStatus
          payment_mode: PaymentMode
          payment_status: PaymentStatus
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          offer_id: string
          resident_id: string
          recycler_id: string
          final_price_per_kg: number
          total_estimated_price: number
          scheduled_pickup_time: string
          status?: TransactionStatus
          payment_mode?: PaymentMode
          payment_status?: PaymentStatus
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          offer_id?: string
          resident_id?: string
          recycler_id?: string
          final_price_per_kg?: number
          total_estimated_price?: number
          scheduled_pickup_time?: string
          status?: TransactionStatus
          payment_mode?: PaymentMode
          payment_status?: PaymentStatus
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_reviews: {
        Row: {
          id: string
          transaction_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number | null
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          reviewer_id: string
          reviewee_id: string
          rating?: number | null
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          reviewer_id?: string
          reviewee_id?: string
          rating?: number | null
          comment?: string | null
          created_at?: string
        }
        Relationships: []
      }
      area_risk_zones: {
        Row: {
          zone_id: string
          risk_score: number
          risk_level: RiskLevel
          report_count: number
          unresolved_count: number
          dominant_category: WasteCategory | null
          severity_index: number
          last_cleanup_at: string | null
          last_report_at: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          zone_id: string
          risk_score?: number
          risk_level?: RiskLevel
          report_count?: number
          unresolved_count?: number
          dominant_category?: WasteCategory | null
          severity_index?: number
          last_cleanup_at?: string | null
          last_report_at?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          zone_id?: string
          risk_score?: number
          risk_level?: RiskLevel
          report_count?: number
          unresolved_count?: number
          dominant_category?: WasteCategory | null
          severity_index?: number
          last_cleanup_at?: string | null
          last_report_at?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      government_benchmarks: {
        Row: {
          id: string
          city: string
          state: string
          cleanliness_rank: number | null
          cleanliness_score: number | null
          waste_processed_tpd: number | null
          door_to_door_coverage_pct: number | null
          source_segregation_pct: number | null
          population_lakhs: number | null
          survey_year: number
          survey_source: string
          created_at: string
        }
        Insert: {
          id?: string
          city: string
          state: string
          cleanliness_rank?: number | null
          cleanliness_score?: number | null
          waste_processed_tpd?: number | null
          door_to_door_coverage_pct?: number | null
          source_segregation_pct?: number | null
          population_lakhs?: number | null
          survey_year: number
          survey_source?: string
          created_at?: string
        }
        Update: {
          id?: string
          city?: string
          state?: string
          cleanliness_rank?: number | null
          cleanliness_score?: number | null
          waste_processed_tpd?: number | null
          door_to_door_coverage_pct?: number | null
          source_segregation_pct?: number | null
          population_lakhs?: number | null
          survey_year?: number
          survey_source?: string
          created_at?: string
        }
        Relationships: []
      }
      risk_scoring_config: {
        Row: {
          id: string
          weight_density: number
          weight_severity: number
          weight_recency: number
          weight_unresolved: number
          severity_plastic: number
          severity_hazardous: number
          severity_metal: number
          severity_glass: number
          severity_cardboard: number
          severity_paper: number
          severity_organic: number
          severity_mixed: number
          is_active: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          weight_density?: number
          weight_severity?: number
          weight_recency?: number
          weight_unresolved?: number
          severity_plastic?: number
          severity_hazardous?: number
          severity_metal?: number
          severity_glass?: number
          severity_cardboard?: number
          severity_paper?: number
          severity_organic?: number
          severity_mixed?: number
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          weight_density?: number
          weight_severity?: number
          weight_recency?: number
          weight_unresolved?: number
          severity_plastic?: number
          severity_hazardous?: number
          severity_metal?: number
          severity_glass?: number
          severity_cardboard?: number
          severity_paper?: number
          severity_organic?: number
          severity_mixed?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_view: {
        Row: {
          user_id: string
          full_name: string | null
          avatar_url: string | null
          neighborhood_id: string | null
          neighborhood_name: string | null
          total_points: number
          current_streak: number
          reports_count: number
          badges_count: number
          rank: number
        }
        Relationships: []
      }
    }
    Functions: {
      claim_report: {
        Args: {
          p_report_id: string
          p_collector_id: string
          p_idempotency_key: string
        }
        Returns: Json
      }
      complete_report: {
        Args: {
          p_report_id: string
          p_collector_id: string
          p_completion_photo_url: string | null
          p_completion_notes?: string
        }
        Returns: Json
      }
      award_points: {
        Args: {
          p_user_id: string
          p_points: number
          p_reason: PointsReason
          p_description?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: string
      }
      get_neighborhood_stats: {
        Args: { p_neighborhood_id: string }
        Returns: Json
      }
      fn_incremental_risk_update: {
        Args: { p_zone_id: string }
        Returns: undefined
      }
      accept_marketplace_offer: {
        Args: { p_offer_id: string; p_resident_id: string }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      waste_category: WasteCategory
      report_status: ReportStatus
      points_reason: PointsReason
      challenge_type: ChallengeType
      challenge_status: ChallengeStatus
      workshop_type: WorkshopType
      workshop_status: WorkshopStatus
      registration_status: RegistrationStatus
      location_type: LocationType
      notification_type: NotificationType
      conversation_type: ConversationType
      complaint_category: ComplaintCategory
      complaint_status: ComplaintStatus
      listing_status: ListingStatus
      offer_status: OfferStatus
      verification_status: VerificationStatus
      transaction_status: TransactionStatus
      payment_mode: PaymentMode
      payment_status: PaymentStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

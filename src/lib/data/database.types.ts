export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          active: boolean
          commentaire: string | null
          created_at: string
          date_debut: string
          date_fin: string
          id: string
          motif: Database["public"]["Enums"]["absence_type"]
          user_id: string
        }
        Insert: {
          active?: boolean
          commentaire?: string | null
          created_at?: string
          date_debut: string
          date_fin: string
          id?: string
          motif?: Database["public"]["Enums"]["absence_type"]
          user_id: string
        }
        Update: {
          active?: boolean
          commentaire?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string
          id?: string
          motif?: Database["public"]["Enums"]["absence_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_charge_semaine"
            referencedColumns: ["user_id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_users: {
        Row: {
          access_code_hash: string | null
          active: boolean
          auth_user_id: string | null
          color_hex: string
          created_at: string
          email: string | null
          failed_login_attempts: number
          first_name: string | null
          full_name: string
          id: string
          internal_auth_email: string | null
          is_admin: boolean
          last_name: string | null
          locked_until: string | null
          nickname: string
          phone: string | null
          pin_hash: string | null
          porte_visites: boolean
        }
        Insert: {
          access_code_hash?: string | null
          active?: boolean
          auth_user_id?: string | null
          color_hex: string
          created_at?: string
          email?: string | null
          failed_login_attempts?: number
          first_name?: string | null
          full_name?: string
          id?: string
          internal_auth_email?: string | null
          is_admin?: boolean
          last_name?: string | null
          locked_until?: string | null
          nickname: string
          phone?: string | null
          pin_hash?: string | null
          porte_visites?: boolean
        }
        Update: {
          access_code_hash?: string | null
          active?: boolean
          auth_user_id?: string | null
          color_hex?: string
          created_at?: string
          email?: string | null
          failed_login_attempts?: number
          first_name?: string | null
          full_name?: string
          id?: string
          internal_auth_email?: string | null
          is_admin?: boolean
          last_name?: string | null
          locked_until?: string | null
          nickname?: string
          phone?: string | null
          pin_hash?: string | null
          porte_visites?: boolean
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          payload: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          payload?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          payload?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_charge_semaine"
            referencedColumns: ["user_id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          last_seen_at: string
          refresh_token_hash: string
          revoked: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          refresh_token_hash: string
          revoked?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          refresh_token_hash?: string
          revoked?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_charge_semaine"
            referencedColumns: ["user_id"]
          },
        ]
      }
      incidents: {
        Row: {
          active: boolean
          created_at: string
          criticality: number
          description: string | null
          id: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          linked_visit_id: string | null
          reported_by: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["incident_status"]
          store_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          criticality: number
          description?: string | null
          id?: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          linked_visit_id?: string | null
          reported_by: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          store_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          criticality?: number
          description?: string | null
          id?: string
          incident_type?: Database["public"]["Enums"]["incident_type"]
          linked_visit_id?: string | null
          reported_by?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_linked_visit_id_fkey"
            columns: ["linked_visit_id"]
            isOneToOne: false
            referencedRelation: "v_visites_comptees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_linked_visit_id_fkey"
            columns: ["linked_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_charge_semaine"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "incidents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_derive_tiers"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "incidents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_frequence_reelle_magasin"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "incidents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_annee"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "incidents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_mois"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "incidents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_dette"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "incidents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_last_visit"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "incidents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_tier"
            referencedColumns: ["store_id"]
          },
        ]
      }
      public_holidays: {
        Row: {
          jour: string
          libelle: string
        }
        Insert: {
          jour: string
          libelle: string
        }
        Update: {
          jour?: string
          libelle?: string
        }
        Relationships: []
      }
      routing_template_stops: {
        Row: {
          duration_min: number
          position: number
          store_id: string
          template_id: string
        }
        Insert: {
          duration_min?: number
          position: number
          store_id: string
          template_id: string
        }
        Update: {
          duration_min?: number
          position?: number
          store_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_template_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_template_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_derive_tiers"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "routing_template_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_frequence_reelle_magasin"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "routing_template_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_annee"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "routing_template_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_mois"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "routing_template_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_dette"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "routing_template_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_last_visit"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "routing_template_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_tier"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "routing_template_stops_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "routing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          name: string
          zone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          name: string
          zone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_charge_semaine"
            referencedColumns: ["user_id"]
          },
        ]
      }
      routings: {
        Row: {
          active: boolean
          created_at: string
          date: string
          id: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          date: string
          id?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          date?: string
          id?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "routing_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_charge_semaine"
            referencedColumns: ["user_id"]
          },
        ]
      }
      store_assignments: {
        Row: {
          store_id: string
          user_id: string
        }
        Insert: {
          store_id: string
          user_id: string
        }
        Update: {
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_derive_tiers"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_frequence_reelle_magasin"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_annee"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_mois"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_dette"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_last_visit"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_tier"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_charge_semaine"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          address: string | null
          adherent_name: string | null
          adherent_phone: string | null
          city: string
          contact_lang: Database["public"]["Enums"]["contact_lang"]
          created_at: string
          enseigne: Database["public"]["Enums"]["enseigne"]
          external_ref: string | null
          fl_manager_name: string | null
          fl_manager_phone: string | null
          id: string
          jrf_revenue_eur: number | null
          jrf_revenue_year: number | null
          lat: number | null
          lng: number | null
          montage_rayon: boolean
          montage_rayon_heure: string
          name: string
          network: Database["public"]["Enums"]["network_type"] | null
          postal_code: string | null
          region: Database["public"]["Enums"]["region_type"]
          target_frequency_days_override: number | null
          tier_fige: Database["public"]["Enums"]["tier_type"] | null
          tier_fige_at: string | null
          tier_fige_year: number | null
          tier_override: Database["public"]["Enums"]["tier_type"] | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          adherent_name?: string | null
          adherent_phone?: string | null
          city: string
          contact_lang?: Database["public"]["Enums"]["contact_lang"]
          created_at?: string
          enseigne: Database["public"]["Enums"]["enseigne"]
          external_ref?: string | null
          fl_manager_name?: string | null
          fl_manager_phone?: string | null
          id?: string
          jrf_revenue_eur?: number | null
          jrf_revenue_year?: number | null
          lat?: number | null
          lng?: number | null
          montage_rayon?: boolean
          montage_rayon_heure?: string
          name: string
          network?: Database["public"]["Enums"]["network_type"] | null
          postal_code?: string | null
          region: Database["public"]["Enums"]["region_type"]
          target_frequency_days_override?: number | null
          tier_fige?: Database["public"]["Enums"]["tier_type"] | null
          tier_fige_at?: string | null
          tier_fige_year?: number | null
          tier_override?: Database["public"]["Enums"]["tier_type"] | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          adherent_name?: string | null
          adherent_phone?: string | null
          city?: string
          contact_lang?: Database["public"]["Enums"]["contact_lang"]
          created_at?: string
          enseigne?: Database["public"]["Enums"]["enseigne"]
          external_ref?: string | null
          fl_manager_name?: string | null
          fl_manager_phone?: string | null
          id?: string
          jrf_revenue_eur?: number | null
          jrf_revenue_year?: number | null
          lat?: number | null
          lng?: number | null
          montage_rayon?: boolean
          montage_rayon_heure?: string
          name?: string
          network?: Database["public"]["Enums"]["network_type"] | null
          postal_code?: string | null
          region?: Database["public"]["Enums"]["region_type"]
          target_frequency_days_override?: number | null
          tier_fige?: Database["public"]["Enums"]["tier_type"] | null
          tier_fige_at?: string | null
          tier_fige_year?: number | null
          tier_override?: Database["public"]["Enums"]["tier_type"] | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      visit_photos: {
        Row: {
          active: boolean
          bytes: number | null
          caption: string | null
          created_at: string
          height: number | null
          id: string
          position: number
          storage_path: string
          taken_at: string | null
          visit_id: string
          width: number | null
        }
        Insert: {
          active?: boolean
          bytes?: number | null
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          storage_path: string
          taken_at?: string | null
          visit_id: string
          width?: number | null
        }
        Update: {
          active?: boolean
          bytes?: number | null
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          storage_path?: string
          taken_at?: string | null
          visit_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "v_visites_comptees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          active: boolean
          checkin_at: string | null
          checkin_lat: number | null
          checkin_lng: number | null
          checkout_at: string | null
          created_at: string
          id: string
          motif_annulation: string | null
          motif_depannage: string | null
          notes: string | null
          position_in_day: number | null
          rayon_conforme: boolean | null
          relais_centrale: boolean
          remplacee_par_visite_id: string | null
          report: Json | null
          report_submitted_at: string | null
          routing_id: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["visit_status"]
          store_id: string
          updated_at: string
          user_id: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          active?: boolean
          checkin_at?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_at?: string | null
          created_at?: string
          id?: string
          motif_annulation?: string | null
          motif_depannage?: string | null
          notes?: string | null
          position_in_day?: number | null
          rayon_conforme?: boolean | null
          relais_centrale?: boolean
          remplacee_par_visite_id?: string | null
          report?: Json | null
          report_submitted_at?: string | null
          routing_id?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["visit_status"]
          store_id: string
          updated_at?: string
          user_id: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          active?: boolean
          checkin_at?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_at?: string | null
          created_at?: string
          id?: string
          motif_annulation?: string | null
          motif_depannage?: string | null
          notes?: string | null
          position_in_day?: number | null
          rayon_conforme?: boolean | null
          relais_centrale?: boolean
          remplacee_par_visite_id?: string | null
          report?: Json | null
          report_submitted_at?: string | null
          routing_id?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["visit_status"]
          store_id?: string
          updated_at?: string
          user_id?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "visits_remplacee_par_visite_id_fkey"
            columns: ["remplacee_par_visite_id"]
            isOneToOne: false
            referencedRelation: "v_visites_comptees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_remplacee_par_visite_id_fkey"
            columns: ["remplacee_par_visite_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_routing_id_fkey"
            columns: ["routing_id"]
            isOneToOne: false
            referencedRelation: "routings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_derive_tiers"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_frequence_reelle_magasin"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_annee"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_mois"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_dette"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_last_visit"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_tier"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_charge_semaine"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      v_capacite_semaine: {
        Row: {
          annee_iso: number | null
          capacite_hors_urgences: number | null
          capacite_visites: number | null
          dimanche: string | null
          jours_travailles: number | null
          lundi: string | null
          personnes_presentes: number | null
          semaine_iso: number | null
        }
        Relationships: []
      }
      v_charge_semaine: {
        Row: {
          annee_iso: number | null
          montages_planifies: number | null
          semaine_iso: number | null
          surnom: string | null
          user_id: string | null
          visites_planifiees: number | null
        }
        Relationships: []
      }
      v_cout_montage_semaine: {
        Row: {
          creneaux_consommes: number | null
          magasins_eligibles: number | null
          montages_par_semaine: number | null
          par_commercial_par_jour: number | null
        }
        Relationships: []
      }
      v_couverture_mensuelle: {
        Row: {
          couverture_pct: number | null
          magasins_vus: number | null
          mois: string | null
          parc: number | null
          visites_faites: number | null
        }
        Relationships: []
      }
      v_derive_tiers: {
        Row: {
          a_derive: boolean | null
          jrf_revenue_eur: number | null
          magasin: string | null
          store_id: string | null
          tier_fige: Database["public"]["Enums"]["tier_type"] | null
          tier_fige_at: string | null
          tier_override: Database["public"]["Enums"]["tier_type"] | null
          tier_theorique: Database["public"]["Enums"]["tier_type"] | null
        }
        Relationships: []
      }
      v_derive_tiers_resume: {
        Row: {
          derive_pct: number | null
          dernier_recalcul: string | null
          magasins: number | null
          ont_derive: number | null
        }
        Relationships: []
      }
      v_diagnostic_capacite: {
        Row: {
          besoin_theorique: number | null
          capacite_totale: number | null
          consomme_par_montage: number | null
          marge: number | null
          reste_pour_audits: number | null
          verdict: string | null
        }
        Relationships: []
      }
      v_frequence_reelle_magasin: {
        Row: {
          ecart_jours: number | null
          frequence_cible_jours: number | null
          frequence_reelle_jours: number | null
          name: string | null
          nb_intervalles: number | null
          pire_intervalle_jours: number | null
          store_id: string | null
          tier: Database["public"]["Enums"]["tier_type"] | null
        }
        Relationships: []
      }
      v_frequences_calculees: {
        Row: {
          capacite_hebdo_audits: number | null
          capacite_hebdo_totale: number | null
          capacite_insuffisante: boolean | null
          dont_montage_rayon: number | null
          frequence_atteignable_jours: number | null
          frequence_souhaitee_jours: number | null
          magasins: number | null
          poids: number | null
          tier: Database["public"]["Enums"]["tier_type"] | null
          visites_hebdo_allouees: number | null
        }
        Relationships: []
      }
      v_rotation_montage: {
        Row: {
          jours_entre_deux_montages: number | null
          magasins_eligibles: number | null
          montages_par_magasin_par_an: number | null
          montages_par_semaine: number | null
        }
        Relationships: []
      }
      v_stats_effort_par_tier: {
        Row: {
          indice_effort: number | null
          magasins: number | null
          part_ca_pct: number | null
          part_parc_pct: number | null
          part_visites_pct: number | null
          tier: Database["public"]["Enums"]["tier_type"] | null
          visites: number | null
        }
        Relationships: []
      }
      v_stats_incidents_mois: {
        Row: {
          criticality: number | null
          delai_resolution_heures: number | null
          incident_type: Database["public"]["Enums"]["incident_type"] | null
          mois: string | null
          ouverts: number | null
          resolus: number | null
          total: number | null
        }
        Relationships: []
      }
      v_stats_magasin_annee: {
        Row: {
          annee: string | null
          enseigne: Database["public"]["Enums"]["enseigne"] | null
          frequence_cible_jours: number | null
          frequence_reelle_jours: number | null
          indice_effort: number | null
          magasin: string | null
          part_ca_pct: number | null
          part_visites_pct: number | null
          region: Database["public"]["Enums"]["region_type"] | null
          store_id: string | null
          tier: Database["public"]["Enums"]["tier_type"] | null
          visites: number | null
        }
        Relationships: []
      }
      v_stats_magasin_mois: {
        Row: {
          dont_demos: number | null
          dont_urgences: number | null
          enseigne: Database["public"]["Enums"]["enseigne"] | null
          indice_effort: number | null
          magasin: string | null
          mois: string | null
          part_ca_pct: number | null
          part_visites_pct: number | null
          region: Database["public"]["Enums"]["region_type"] | null
          store_id: string | null
          tier: Database["public"]["Enums"]["tier_type"] | null
          visites: number | null
        }
        Relationships: []
      }
      v_stats_parc: {
        Row: {
          dette_moyenne: number | null
          en_retard: number | null
          enseigne: Database["public"]["Enums"]["enseigne"] | null
          jamais_vus: number | null
          magasins: number | null
          region: Database["public"]["Enums"]["region_type"] | null
          tier: Database["public"]["Enums"]["tier_type"] | null
          urgents: number | null
        }
        Relationships: []
      }
      v_store_dette: {
        Row: {
          dette_visite: number | null
          frequence_cible_jours: number | null
          jours_depuis_derniere_visite: number | null
          last_visit_at: string | null
          name: string | null
          score_priorite: number | null
          store_id: string | null
          tier: Database["public"]["Enums"]["tier_type"] | null
        }
        Relationships: []
      }
      v_store_last_visit: {
        Row: {
          last_montage_at: string | null
          last_visit_at: string | null
          store_id: string | null
        }
        Relationships: []
      }
      v_store_tier: {
        Row: {
          store_id: string | null
          tier: Database["public"]["Enums"]["tier_type"] | null
        }
        Relationships: []
      }
      v_suivi_montage_mois: {
        Row: {
          annules_autre_motif: number | null
          cedes_a_une_urgence: number | null
          magasins_couverts: number | null
          mois: string | null
          montages_faits: number | null
          montages_planifies: number | null
          taux_realisation_pct: number | null
        }
        Relationships: []
      }
      v_visites_comptees: {
        Row: {
          annee: string | null
          checkout_at: string | null
          id: string | null
          mois: string | null
          scheduled_date: string | null
          store_id: string | null
          visit_type: Database["public"]["Enums"]["visit_type"] | null
        }
        Insert: {
          annee?: never
          checkout_at?: string | null
          id?: string | null
          mois?: never
          scheduled_date?: string | null
          store_id?: string | null
          visit_type?: Database["public"]["Enums"]["visit_type"] | null
        }
        Update: {
          annee?: never
          checkout_at?: string | null
          id?: string | null
          mois?: never
          scheduled_date?: string | null
          store_id?: string | null
          visit_type?: Database["public"]["Enums"]["visit_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_derive_tiers"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_frequence_reelle_magasin"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_annee"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_stats_magasin_mois"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_dette"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_last_visit"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_store_tier"
            referencedColumns: ["store_id"]
          },
        ]
      }
    }
    Functions: {
      _recalculer_tiers_interne: {
        Args: { p_actor?: string }
        Returns: {
          changements: number
          magasins: number
          tier: Database["public"]["Enums"]["tier_type"]
        }[]
      }
      current_app_user_id: { Args: never; Returns: string }
      frequence_cible: { Args: { p_store: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      jours_travailles: {
        Args: { p_debut: string; p_fin: string; p_user: string }
        Returns: number
      }
      recalculer_tiers: {
        Args: never
        Returns: {
          changements: number
          magasins: number
          tier: Database["public"]["Enums"]["tier_type"]
        }[]
      }
      stats_magasins: {
        Args: { p_debut: string; p_fin: string }
        Returns: {
          enseigne: Database["public"]["Enums"]["enseigne"]
          indice_effort: number
          jours_depuis_derniere_visite: number
          magasin: string
          part_ca_pct: number
          part_visites_pct: number
          region: Database["public"]["Enums"]["region_type"]
          store_id: string
          tier: Database["public"]["Enums"]["tier_type"]
          visites: number
        }[]
      }
      taux_couverture: { Args: { p_zone?: string }; Returns: number }
    }
    Enums: {
      absence_type: "conges" | "maladie" | "formation" | "autre"
      contact_lang: "fr" | "nl"
      enseigne:
        | "intermarche"
        | "ad_delhaize"
        | "proxy_delhaize"
        | "delhaize"
        | "spar"
      incident_status: "ouvert" | "en_cours" | "resolu"
      incident_type: "oubli_livraison" | "rupture" | "litige_qualite" | "autre"
      network_type: "by_mestdagh" | "independant" | "affilie" | "integre"
      region_type: "wallonie" | "bruxelles" | "flandre"
      tier_type: "A" | "B" | "C"
      visit_status: "planifiee" | "faite" | "annulee" | "reportee"
      visit_type:
        | "montage_rayon"
        | "conseil"
        | "demo"
        | "depannage"
        | "urgence"
        | "rattrapage"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      absence_type: ["conges", "maladie", "formation", "autre"],
      contact_lang: ["fr", "nl"],
      enseigne: [
        "intermarche",
        "ad_delhaize",
        "proxy_delhaize",
        "delhaize",
        "spar",
      ],
      incident_status: ["ouvert", "en_cours", "resolu"],
      incident_type: ["oubli_livraison", "rupture", "litige_qualite", "autre"],
      network_type: ["by_mestdagh", "independant", "affilie", "integre"],
      region_type: ["wallonie", "bruxelles", "flandre"],
      tier_type: ["A", "B", "C"],
      visit_status: ["planifiee", "faite", "annulee", "reportee"],
      visit_type: ["montage_rayon", "conseil", "demo", "depannage", "urgence", "rattrapage"],
    },
  },
} as const

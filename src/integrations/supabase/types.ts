export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'admin' | 'agent' | 'requester';
export type TicketCategory = 'hardware' | 'software' | 'network' | 'access' | 'other';
export type TicketUrgency = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          requester_id: string;
          title: string;
          description: string;
          ai_category: TicketCategory | null;
          ai_urgency: TicketUrgency | null;
          ai_suggested_steps: Json | null;
          ai_classified_at: string | null;
          final_category: TicketCategory | null;
          final_urgency: TicketUrgency | null;
          status: TicketStatus;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          title: string;
          description: string;
          ai_category?: TicketCategory | null;
          ai_urgency?: TicketUrgency | null;
          ai_suggested_steps?: Json | null;
          ai_classified_at?: string | null;
          final_category?: TicketCategory | null;
          final_urgency?: TicketUrgency | null;
          status?: TicketStatus;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          requester_id?: string;
          title?: string;
          description?: string;
          ai_category?: TicketCategory | null;
          ai_urgency?: TicketUrgency | null;
          ai_suggested_steps?: Json | null;
          ai_classified_at?: string | null;
          final_category?: TicketCategory | null;
          final_urgency?: TicketUrgency | null;
          status?: TicketStatus;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
      };
      ticket_comments: {
        Row: {
          id: string;
          ticket_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
      };
    };
  };
}

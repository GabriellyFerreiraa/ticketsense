import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { NewTicketForm } from '@/components/forms/NewTicketForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UrgencyBadge, CategoryBadge, StatusBadge } from '@/components/TicketBadges';
import { formatDistanceToNow } from 'date-fns';
import { ListChecks, Trash2 } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  ai_category: string | null;
  ai_urgency: string | null;
  ai_suggested_steps: string[] | null;
  status: string;
  created_at: string;
}

export const RequesterDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });
    setTickets((data as any) || []);
    setLoading(false);
  };

  const deleteTicket = async (ticketId: string) => {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return;

    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (error) {
      toast({ title: 'Error', description: 'Could not delete the ticket', variant: 'destructive' });
      return;
    }
    toast({ title: 'Ticket deleted' });
    fetchTickets();
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  return (
    <div className="grid gap-6 md:grid-cols-[380px_1fr]">
      <NewTicketForm onSuccess={fetchTickets} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            My Tickets
          </CardTitle>
          <CardDescription>Status and AI triage for the tickets you've opened</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't opened any tickets yet.</p>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="text-sm text-muted-foreground">{ticket.description}</p>
                <div className="flex flex-wrap gap-2">
                  <CategoryBadge category={ticket.ai_category} />
                  <UrgencyBadge urgency={ticket.ai_urgency} />
                </div>
                {ticket.ai_suggested_steps && ticket.ai_suggested_steps.length > 0 && (
                  <div className="bg-muted/50 rounded p-3 text-sm">
                    <p className="font-medium mb-1">Suggested first steps:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {ticket.ai_suggested_steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteTicket(ticket.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

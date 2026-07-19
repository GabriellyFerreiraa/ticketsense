import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UrgencyBadge, CategoryBadge, StatusBadge } from '@/components/TicketBadges';
import { formatDistanceToNow } from 'date-fns';
import { Inbox, UserCheck } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  ai_category: string | null;
  ai_urgency: string | null;
  final_category: string | null;
  final_urgency: string | null;
  ai_suggested_steps: string[] | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  requester_id: string;
  requester_name?: string;
}

const URGENCY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const AgentDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'open' | 'in_progress' | 'resolved' | 'all'>('open');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTickets = async () => {
    setLoading(true);
    const { data: rawTickets } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!rawTickets) {
      setTickets([]);
      setLoading(false);
      return;
    }

    // Fetch requester names in one extra query rather than N+1 individual lookups
    const requesterIds = [...new Set(rawTickets.map((t: any) => t.requester_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', requesterIds);

    const nameByUserId = new Map((profiles || []).map((p: any) => [p.user_id, p.name]));
    const enriched = rawTickets.map((t: any) => ({
      ...t,
      requester_name: nameByUserId.get(t.requester_id) ?? 'Unknown',
    }));

    setTickets(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const updateStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', ticketId);

    if (error) {
      toast({ title: 'Error', description: 'Could not update the ticket', variant: 'destructive' });
      return;
    }
    fetchTickets();
  };

  const assignToMe = async (ticketId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: user.id, status: 'in_progress' })
      .eq('id', ticketId);

    if (error) {
      toast({ title: 'Error', description: 'Could not assign the ticket', variant: 'destructive' });
      return;
    }
    fetchTickets();
  };

  const overrideClassification = async (ticketId: string, field: 'final_category' | 'final_urgency', value: string) => {
    const { error } = await supabase.from('tickets').update({ [field]: value }).eq('id', ticketId);
    if (error) {
      toast({ title: 'Error', description: 'Could not update classification', variant: 'destructive' });
      return;
    }
    fetchTickets();
  };

  const filtered = tickets
    .filter((t) => (statusFilter === 'all' ? true : statusFilter === 'resolved' ? (t.status === 'resolved' || t.status === 'closed') : t.status === statusFilter))
    .sort((a, b) => {
      const uA = URGENCY_ORDER[a.final_urgency ?? a.ai_urgency ?? ''] ?? 99;
      const uB = URGENCY_ORDER[b.final_urgency ?? b.ai_urgency ?? ''] ?? 99;
      return uA - uB;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          Ticket Queue
        </CardTitle>
        <CardDescription>Sorted by urgency — critical tickets first</CardDescription>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="mt-2">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tickets...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets in this view.</p>
        ) : (
          filtered.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.requester_name} · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </div>

              <p className="text-sm text-muted-foreground">{ticket.description}</p>

              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={ticket.final_category ?? ticket.ai_category} />
                <UrgencyBadge urgency={ticket.final_urgency ?? ticket.ai_urgency} />
                {ticket.ai_category && !ticket.final_category && (
                  <span className="text-xs text-muted-foreground">(AI suggestion)</span>
                )}
              </div>

              {ticket.ai_suggested_steps && ticket.ai_suggested_steps.length > 0 && (
                <div className="bg-muted/50 rounded p-3 text-sm">
                  <p className="font-medium mb-1">AI-suggested first steps:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {ticket.ai_suggested_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Select onValueChange={(v) => overrideClassification(ticket.id, 'final_urgency', v)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="Override urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={(v) => overrideClassification(ticket.id, 'final_category', v)}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Override category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="access">Access</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                {!ticket.assigned_to && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => assignToMe(ticket.id)}>
                    <UserCheck className="h-3 w-3 mr-1" />
                    Assign to me
                  </Button>
                )}

                {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                  <Button size="sm" className="h-8 text-xs ml-auto" onClick={() => updateStatus(ticket.id, 'resolved')}>
                    Mark resolved
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface NewTicketFormProps {
  onSuccess: () => void;
}

export const NewTicketForm = ({ onSuccess }: NewTicketFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Step 1: ask the Edge Function to classify the ticket with Claude.
      // If this fails for any reason, we still create the ticket —
      // an agent can classify it manually. The AI is a helper, not a blocker.
      let aiResult: { category?: string; urgency?: string; suggested_steps?: string[] } = {};

      const { data: fnData, error: fnError } = await supabase.functions.invoke('classify-ticket', {
        body: { title, description },
      });

      if (fnError) {
        console.error('AI classification unavailable:', fnError);
        toast({
          title: 'AI classification unavailable',
          description: 'Your ticket was still created. An agent will classify it manually.',
        });
      } else {
        aiResult = fnData;
      }

      // Step 2: insert the ticket, including whatever the AI returned (if anything)
      const { error: insertError } = await supabase.from('tickets').insert({
        requester_id: user.id,
        title,
        description,
        ai_category: aiResult.category as any,
        ai_urgency: aiResult.urgency as any,
        ai_suggested_steps: aiResult.suggested_steps ?? null,
        ai_classified_at: aiResult.category ? new Date().toISOString() : null,
      });

      if (insertError) throw insertError;

      toast({ title: 'Ticket submitted', description: 'Your ticket has been created.' });
      setTitle('');
      setDescription('');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({ title: 'Error', description: 'Could not submit the ticket', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          New Ticket
        </CardTitle>
        <CardDescription>
          Describe your issue. Our AI will suggest a category, urgency, and first diagnostic steps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Can't connect to the VPN"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening? What have you already tried?"
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

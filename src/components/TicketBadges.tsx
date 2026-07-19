import { Badge } from '@/components/ui/badge';

const URGENCY_STYLES: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  critical: 'bg-destructive/15 text-destructive',
};

const CATEGORY_LABELS: Record<string, string> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Network',
  access: 'Access',
  other: 'Other',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-primary/15 text-primary',
  in_progress: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  resolved: 'bg-muted text-muted-foreground',
  closed: 'bg-muted text-muted-foreground',
};

export const UrgencyBadge = ({ urgency }: { urgency?: string | null }) => {
  if (!urgency) return <Badge variant="outline">Not classified</Badge>;
  return (
    <Badge className={URGENCY_STYLES[urgency] ?? ''} variant="secondary">
      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </Badge>
  );
};

export const CategoryBadge = ({ category }: { category?: string | null }) => {
  if (!category) return <Badge variant="outline">Uncategorized</Badge>;
  return <Badge variant="outline">{CATEGORY_LABELS[category] ?? category}</Badge>;
};

export const StatusBadge = ({ status }: { status: string }) => {
  const label = status.replace('_', ' ');
  return (
    <Badge className={STATUS_STYLES[status] ?? ''} variant="secondary">
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </Badge>
  );
};

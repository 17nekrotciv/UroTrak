// src/components/ui/PageHeader.tsx
import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode; // For actions like "Add New" button
}

export default function PageHeader({ title, description, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-b">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-8 w-8 text-primary" />}
          <div>
            <h2 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {children && <div className="flex-shrink-0">{children}</div>}
      </div>
    </div>
  );
}

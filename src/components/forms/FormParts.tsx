// src/components/forms/FormParts.tsx
"use client"

import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface DatePickerFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  error?: string;
}

export function DatePickerField({ control, name, label, error }: DatePickerFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={cn(error && "text-destructive")}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={name}
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !field.value && "text-muted-foreground",
                  error && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value ? format(new Date(field.value), "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => field.onChange(date?.toISOString())}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

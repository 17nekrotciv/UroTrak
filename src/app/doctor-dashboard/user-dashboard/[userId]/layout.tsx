// src/app/doctor-dashboard/user-dashboard/[userId]/layout.tsx
"use client";

import React, { type ReactNode } from 'react';

// Este layout agora apenas passa o conteúdo da página (children) adiante.
// Toda a lógica da interface (como a sidebar) foi movida para o layout pai
// em `src/app/dashboard/layout.tsx` para evitar duplicação.
export default function DoctorPatientViewLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}


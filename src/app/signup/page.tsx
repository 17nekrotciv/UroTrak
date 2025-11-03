"use client";

import React, { Suspense } from "react";
import SignupPageContent from "./SignupPageContent";

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <SignupPageContent />
    </Suspense>
  );
}

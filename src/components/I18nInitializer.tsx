
'use client';

import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n'; // Your i18n configuration file

interface I18nInitializerProps {
  children: ReactNode;
}

export default function I18nInitializer({ children }: I18nInitializerProps) {
  // This component ensures i18n instance is initialized and provided.
  // For App Router, i18next is typically initialized in a client component.
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

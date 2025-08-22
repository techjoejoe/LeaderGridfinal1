
"use client";

import { useEffect } from 'react';
import { analytics } from '@/lib/firebase';

export function FirebaseAnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // This will initialize analytics when the component mounts on the client-side.
    analytics;
  }, []);

  return <>{children}</>;
}


"use client";

import React, { useState } from 'react';
import type { Poll, PollSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PollCreator } from './poll-creator';
import { PollList } from './poll-list';
import { QrCode, Presentation, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type AdminDashboardProps = {
  classId: string;
  session: PollSession | null;
  onCreateSession: () => void;
};

export function AdminDashboard({ classId, session, onCreateSession }: AdminDashboardProps) {
  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const { toast } = useToast();

  if (!session) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">No Active Polling Session</h2>
        <p className="text-muted-foreground mb-6">Create a new session to start collecting votes.</p>
        <Button onClick={onCreateSession}>Create New Session</Button>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/livevote?sessionCode=${session.code}`;
  const displayUrl = `${window.location.origin}/livevote/display?sessionCode=${session.code}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!`, description: 'The link is ready to share.' });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Admin Dashboard</span>
            <span className="text-sm font-medium text-muted-foreground">SESSION CODE: <span className="font-bold text-foreground">{session.code}</span></span>
          </CardTitle>
          <CardDescription>Manage your live polling session. Create new polls and view results as they come in.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setQrModalOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            Show Join QR Code
          </Button>
          <Button variant="outline" onClick={() => copyToClipboard(joinUrl, 'Join Link')}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Join Link
          </Button>
          <Button variant="secondary" onClick={() => window.open(displayUrl, '_blank')}>
            <Presentation className="mr-2 h-4 w-4" />
            Open Projector View
          </Button>
        </CardContent>
      </Card>
      
      <PollCreator session={session} />

      <PollList session={session} />

      <Dialog open={isQrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Session</DialogTitle>
            <DialogDescription>Scan this QR code with your phone to join the polling session.</DialogDescription>
          </DialogHeader>
          <div className="p-4 flex flex-col items-center justify-center gap-4">
            <QRCode value={joinUrl} size={256} />
            <p className="font-bold text-2xl">{session.code}</p>
            <p className="text-sm text-muted-foreground">{joinUrl}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

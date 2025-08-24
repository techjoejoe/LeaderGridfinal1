
"use client";

import React, { useState } from 'react';
import type { Poll, PollSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useToast } from '@/hooks/use-toast';
import { ResultsDisplay } from './results-display';

type PollListProps = {
  session: PollSession;
};

export function PollList({ session }: PollListProps) {
  const { toast } = useToast();
  const [loadingPollId, setLoadingPollId] = useState<string | null>(null);

  const polls = session.polls ? Object.values(session.polls).sort((a, b) => b.createdAt - a.createdAt) : [];

  const handleToggleActivate = async (poll: Poll) => {
    setLoadingPollId(poll.id);
    try {
      const functions = getFunctions();
      const togglePollActiveCallable = httpsCallable(functions, 'togglePollActive');
      await togglePollActiveCallable({
        sessionId: session.id,
        pollId: poll.id,
        isActive: !poll.isActive
      });
    } catch (error: any) {
      console.error("Error toggling poll activation:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not update poll status.' });
    } finally {
        setLoadingPollId(null);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
     if (window.confirm('Are you sure you want to delete this poll? This cannot be undone.')) {
        setLoadingPollId(pollId);
        try {
            const functions = getFunctions();
            const deletePollCallable = httpsCallable(functions, 'deletePoll');
            await deletePollCallable({
                sessionId: session.id,
                pollId,
            });
            toast({ title: 'Poll Deleted' });
        } catch (error: any) {
            console.error("Error deleting poll:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not delete the poll.' });
        } finally {
            setLoadingPollId(null);
        }
     }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Polls</CardTitle>
        <CardDescription>Activate a poll to allow voting. Only one poll can be active at a time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {polls.length === 0 ? (
          <p className="text-muted-foreground text-center">No polls created yet.</p>
        ) : (
          polls.map(poll => (
            <Card key={poll.id} className={poll.isActive ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="text-lg">{poll.question}</span>
                  <div className="flex gap-2">
                    <Button
                      variant={poll.isActive ? "default" : "outline"}
                      onClick={() => handleToggleActivate(poll)}
                      disabled={loadingPollId === poll.id}
                    >
                      {loadingPollId === poll.id ? '...' : (poll.isActive ? "Deactivate" : "Activate")}
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeletePoll(poll.id)} disabled={loadingPollId === poll.id}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>Created: {new Date(poll.createdAt).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResultsDisplay poll={poll} />
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}

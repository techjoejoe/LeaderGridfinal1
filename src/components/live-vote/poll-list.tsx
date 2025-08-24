
"use client";

import React from 'react';
import type { Poll, PollSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { ref, update, remove } from "firebase/database";
import { rtdb } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { ResultsDisplay } from './results-display';

type PollListProps = {
  session: PollSession;
};

export function PollList({ session }: PollListProps) {
  const { toast } = useToast();
  const polls = session.polls ? Object.values(session.polls).sort((a, b) => b.createdAt - a.createdAt) : [];

  const handleToggleActivate = async (poll: Poll) => {
    const sessionRef = ref(rtdb, `live-polls/${session.id}`);
    try {
      // If we are activating a new poll, deactivate any currently active poll
      if (!poll.isActive) {
        // Deactivate all other polls first
        const updates: { [key: string]: any } = {
          activePollId: poll.id
        };
        polls.forEach(p => {
          if (p.isActive) {
            updates[`/polls/${p.id}/isActive`] = false;
          }
        });
         updates[`/polls/${poll.id}/isActive`] = true;
        await update(sessionRef, updates);
      } else {
        // Deactivating the current poll
        await update(sessionRef, {
          activePollId: null,
          [`/polls/${poll.id}/isActive`]: false
        });
      }
    } catch (error) {
      console.error("Error toggling poll activation:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update poll status.' });
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (window.confirm('Are you sure you want to delete this poll? This cannot be undone.')) {
      const pollRef = ref(rtdb, `live-polls/${session.id}/polls/${pollId}`);
      try {
        await remove(pollRef);

        // If the deleted poll was active, clear the activePollId
        if (session.activePollId === pollId) {
            const sessionRef = ref(rtdb, `live-polls/${session.id}`);
            await update(sessionRef, { activePollId: null });
        }

        toast({ title: 'Poll Deleted' });
      } catch (error) {
        console.error("Error deleting poll:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the poll.' });
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
                    >
                      {poll.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeletePoll(poll.id)}>
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

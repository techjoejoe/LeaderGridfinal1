
"use client";

import React, { useState, useEffect } from 'react';
import type { Poll, PollSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ref, update, increment } from "firebase/database";
import { rtdb } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { ResultsDisplay } from './results-display';
import { CheckCircle } from 'lucide-react';

type VotingInterfaceProps = {
  session: PollSession | null;
  sessionCode: string;
};

export function VotingInterface({ session, sessionCode }: VotingInterfaceProps) {
  const [votedPolls, setVotedPolls] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load voted polls from localStorage
    const storedVotes = localStorage.getItem(`live-vote-history-${sessionCode}`);
    if (storedVotes) {
      setVotedPolls(JSON.parse(storedVotes));
    }
  }, [sessionCode]);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!session || votedPolls.includes(pollId)) return;

    try {
      const voteRef = ref(rtdb, `live-polls/${session.id}/polls/${pollId}/options`);
      
      const poll = session.polls[pollId];
      const optionIndex = poll.options.findIndex(o => o.id === optionId);
      
      if (optionIndex === -1) throw new Error("Option not found");
      
      await update(ref(rtdb, `live-polls/${session.id}/polls/${pollId}/options/${optionIndex}`), {
        votes: increment(1)
      });
      
      const newVotedPolls = [...votedPolls, pollId];
      setVotedPolls(newVotedPolls);
      localStorage.setItem(`live-vote-history-${sessionCode}`, JSON.stringify(newVotedPolls));

      toast({ title: 'Vote Cast!', description: 'Thank you for your participation.' });
    } catch (error) {
      console.error("Error casting vote:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not cast your vote.' });
    }
  };

  if (!session) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Loading Session...</CardTitle>
          <CardDescription>Looking for a session with code {sessionCode}. Please wait.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activePoll = session.polls && session.activePollId ? session.polls[session.activePollId] : null;

  if (!activePoll) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Polling Paused</CardTitle>
          <CardDescription>The host has not activated a poll yet. Please wait for the next question.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasVoted = votedPolls.includes(activePoll.id);

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{activePoll.question}</CardTitle>
        <CardDescription>Select one of the options below to cast your vote.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasVoted ? (
          <div>
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted rounded-lg">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-xl font-bold">Thank You for Voting!</h3>
                <p className="text-muted-foreground">Results are being displayed by the host.</p>
            </div>
            <div className="mt-6">
                <h4 className="font-semibold mb-2">Live Results:</h4>
                <ResultsDisplay poll={activePoll} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activePoll.options.map((option) => (
              <Button
                key={option.id}
                onClick={() => handleVote(activePoll.id, option.id)}
                className="h-auto py-4 text-base"
                variant="outline"
              >
                {option.text}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

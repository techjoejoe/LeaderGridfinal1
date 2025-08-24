'use client';

import React from 'react';
import type { QuizPlayer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  players: QuizPlayer[];
}

export function Leaderboard({ players }: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getMedalClass = (rank: number) => {
    if (rank === 0) return 'bg-yellow-400 border-yellow-500';
    if (rank === 1) return 'bg-gray-300 border-gray-400';
    if (rank === 2) return 'bg-yellow-600 border-yellow-700';
    return 'bg-muted';
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <Trophy className="mx-auto h-12 w-12 text-yellow-500" />
        <CardTitle>Final Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div key={player.id} className={cn("flex items-center p-3 rounded-lg border", getMedalClass(index))}>
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-background/50 font-bold mr-4">
              {index + 1}
            </div>
            <div className="flex-grow font-semibold">{player.name}</div>
            <div className="font-bold">{player.score} pts</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

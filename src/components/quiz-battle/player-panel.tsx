'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Leaderboard } from './leaderboard';

export function PlayerPanel() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState<'joining' | 'waiting' | 'playing' | 'ended'>('joining');
  const [question, setQuestion] = useState<any>(null);
  const { toast } = useToast();

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your name and a room code.' });
      return;
    }
    setGameState('waiting');
    // In a real app, this would emit a 'join-room' event to the server
    toast({ title: `Welcome, ${playerName}!`, description: 'Waiting for the quiz to start.' });
  };
  
  if (gameState === 'joining') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Join a Quiz</CardTitle>
          <CardDescription>Enter your name and the room code provided by the host.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">Your Name</Label>
            <Input id="playerName" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input id="roomCode" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="Enter 4-digit code" maxLength={4} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleJoin} className="w-full">Join Quiz</Button>
        </CardFooter>
      </Card>
    );
  }

  if (gameState === 'waiting') {
     return (
       <Card className="max-w-md mx-auto text-center">
            <CardHeader>
                <CardTitle>Welcome, {playerName}!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">Waiting for the host to start the quiz...</p>
            </CardContent>
        </Card>
     )
  }
  
  if (gameState === 'playing') {
     return (
        <Card className="max-w-lg mx-auto">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Question 1</CardTitle>
                    <div className="text-2xl font-bold text-primary">30</div>
                </div>
                <CardDescription className="text-lg pt-2">What is the capital of France?</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-4">Paris</Button>
                <Button variant="outline" className="h-auto py-4">London</Button>
                <Button variant="outline" className="h-auto py-4">Berlin</Button>
                <Button variant="outline" className="h-auto py-4">Madrid</Button>
            </CardContent>
        </Card>
     )
  }

  if (gameState === 'ended') {
    // Mock player data for display
    const mockPlayers = [
        { id: '1', name: playerName, score: 1850 },
        { id: '2', name: 'Bob', score: 2200 },
        { id: '3', name: 'Charlie', score: 1500 },
    ];
    return <Leaderboard players={mockPlayers} />;
  }

  return null;
}

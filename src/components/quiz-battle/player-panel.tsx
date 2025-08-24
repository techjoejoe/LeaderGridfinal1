'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Leaderboard } from './leaderboard';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import type { QuizSession } from '@/lib/types';


export function PlayerPanel() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [session, setSession] = useState<QuizSession | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<'joining' | 'waiting' | 'playing' | 'ended'>('joining');
  const [question, setQuestion] = useState<any>(null);
  const { toast } = useToast();

  // Listen for game state changes
   useEffect(() => {
    if (!roomCode) return;
    const sessionRef = ref(rtdb, `quiz-battles/${roomCode}`);
    const unsubscribe = onValue(sessionRef, (snapshot) => {
        if(snapshot.exists()){
            const newSessionState = snapshot.val() as QuizSession;
            setSession(newSessionState);
            // Handle game state transitions based on server data
            if(newSessionState.gameState === 'active' && gameState === 'waiting') {
                setGameState('playing');
            }
             if(newSessionState.gameState === 'ended' && gameState !== 'ended') {
                setGameState('ended');
            }
        } else if (gameState !== 'joining') {
            // Session was deleted or not found after joining
            toast({ variant: 'destructive', title: 'Session Ended', description: 'The host has ended the quiz session.' });
            setGameState('joining');
            setRoomCode('');
            setSession(null);
        }
    });
    return () => unsubscribe();
  }, [roomCode, gameState, toast]);


  const handleJoin = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your name and a room code.' });
      return;
    }
    setLoading(true);
    try {
        const functions = getFunctions();
        const joinQuizSession = httpsCallable(functions, 'joinQuizSession');
        const result = await joinQuizSession({ roomCode: roomCode.toUpperCase(), playerName });
        const { success, playerId: pId, session: initialSession, message } = result.data as { success: boolean, playerId: string, session: QuizSession, message?: string};
        
        if (success) {
            setPlayerId(pId);
            setSession(initialSession);
            setGameState('waiting');
            toast({ title: `Welcome, ${playerName}!`, description: 'Waiting for the quiz to start.' });
        } else {
             throw new Error(message || "Could not join the room.");
        }
    } catch(error: any) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Failed to Join', description: error.message });
    } finally {
        setLoading(false);
    }
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
          <Button onClick={handleJoin} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Joining...' : 'Join Quiz'}
          </Button>
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
    const mockPlayers = session?.players ? Object.values(session.players) : [];
    return <Leaderboard players={mockPlayers} />;
  }

  return null;
}

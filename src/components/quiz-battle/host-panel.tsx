'use client';

import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { QuizQuestion, QuizSettings, QuizSession } from '@/lib/types';
import Papa from 'papaparse';
import { Upload, Play, ChevronRight, BarChart, Users, Loader2, HelpCircle } from 'lucide-react';
import { Leaderboard } from './leaderboard';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface HostPanelProps {
  classId: string | null;
  user: User | null;
}

export function HostPanel({ classId, user }: HostPanelProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState<QuizSettings>({
    timeLimit: 30,
    basePoints: 1000,
    autoAdvance: false,
    showLeaderboard: true,
  });
  const [session, setSession] = useState<QuizSession | null>(null);
  const [gameState, setGameState] = useState<'setup' | 'lobby' | 'active' | 'ended'>('setup');
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!session?.roomCode) return;
    const sessionRef = ref(rtdb, `quiz-battles/${session.roomCode}`);
    const unsubscribe = onValue(sessionRef, (snapshot) => {
        if(snapshot.exists()){
            setSession(snapshot.val());
        }
    });
    return () => unsubscribe();
  }, [session?.roomCode]);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedQuestions: QuizQuestion[] = results.data.map((row: any, index: number) => {
            if (!row.question || !row.correctAnswer) {
              throw new Error(`Row ${index + 2}: CSV must have "question" and "correctAnswer" columns.`);
            }
            const answers = [row.correctAnswer, row.wrong1, row.wrong2, row.wrong3]
              .filter(ans => ans && String(ans).trim() !== '')
              .map(String);
            
            if (answers.length < 2) {
              throw new Error(`Row ${index + 2}: Question "${row.question}" must have at least 2 answers (a correct one and at least one wrong one).`);
            }

            return {
              id: index,
              question: String(row.question),
              correctAnswer: String(row.correctAnswer),
              answers,
              imageUrl: row.imageUrl ? String(row.imageUrl) : undefined,
            };
          });
          setQuestions(parsedQuestions);
          toast({ title: "Success!", description: `Loaded ${parsedQuestions.length} questions.` });
        } catch (error: any) {
           toast({ variant: "destructive", title: "CSV Parsing Error", description: error.message });
           setQuestions([]);
        }
      },
      error: (error: any) => {
        toast({ variant: "destructive", title: "Error reading file", description: error.message });
        setQuestions([]);
      }
    });
  };
  
  const handleStartQuiz = async () => {
    if (!classId || !user) return;
    setLoading(true);
    try {
        const functions = getFunctions();
        const createQuizSession = httpsCallable(functions, 'createQuizSession');
        const result = await createQuizSession({ classId, settings, questions });
        const { roomCode } = result.data as { roomCode: string };
        setSession({ ...session!, roomCode, players: {}, hostUid: user.uid, id: '', classId, settings, questions, currentQuestion: -1, gameState: 'waiting', answers: {}, createdAt: Date.now() });
        setGameState('lobby');
        toast({ title: "Quiz Room Created!", description: `Room code: ${roomCode}` });
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Could not create quiz session." });
    } finally {
        setLoading(false);
    }
  };
  
  if (!user) {
    return <Card><CardHeader><CardTitle>Please Sign In</CardTitle><CardDescription>You must be signed in to host a quiz.</CardDescription></CardHeader></Card>
  }
  if (!classId) {
      return <Card><CardHeader><CardTitle>No Class Selected</CardTitle><CardDescription>Please go to a class dashboard to start a quiz.</CardDescription></CardHeader></Card>
  }

  const players = session?.players ? Object.values(session.players) : [];

  return (
    <div>
        {gameState === 'setup' && (
            <Card>
                <CardHeader>
                    <CardTitle>Quiz Setup</CardTitle>
                    <CardDescription>Upload a quiz file and configure the settings to begin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="csvFile" className="font-semibold">Upload Quiz CSV</Label>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                        <HelpCircle className="h-3 w-3" />
                                        Example Format
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>CSV File Format Guide</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Your CSV file must contain a header row with the following columns. The order does not matter.
                                      </AlertDialogDescription>
                                      <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2 space-y-1">
                                          <li><span className="font-bold">question</span> (Required): The text for the question.</li>
                                          <li><span className="font-bold">correctAnswer</span> (Required): The correct answer choice.</li>
                                          <li><span className="font-bold">wrong1</span> (Required): At least one wrong answer choice.</li>
                                          <li><span className="font-bold">wrong2</span> (Optional): A second wrong answer choice.</li>
                                          <li><span className="font-bold">wrong3</span> (Optional): A third wrong answer choice.</li>
                                          <li><span className="font-bold">imageUrl</span> (Optional): A direct URL to an image for the question.</li>
                                      </ul>
                                      <p className="text-sm text-muted-foreground mt-2">Example Row:<br/>
                                      <code className="text-xs bg-muted p-1 rounded-sm">"What is the capital of France?",Paris,London,Berlin,Madrid,https://example.com/eiffel.jpg</code>
                                      </p>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogAction>Got it!</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <Input id="csvFile" type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden"/>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                            <Upload className="mr-2 h-4 w-4"/> 
                            {fileInputRef.current?.files?.[0]?.name || 'Choose a CSV file'}
                        </Button>
                        {questions.length > 0 && <p className="text-sm text-muted-foreground mt-2">Loaded {questions.length} questions. First question: "{questions[0].question}"</p>}
                    </div>
                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="timeLimit">Time Limit (seconds)</Label>
                            <Input id="timeLimit" type="number" value={settings.timeLimit} onChange={e => setSettings(s => ({...s, timeLimit: Number(e.target.value)}))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="basePoints">Max Points per Question</Label>
                            <Input id="basePoints" type="number" value={settings.basePoints} onChange={e => setSettings(s => ({...s, basePoints: Number(e.target.value)}))} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <Label htmlFor="autoAdvance">Auto-Advance Questions</Label>
                            <Switch id="autoAdvance" checked={settings.autoAdvance} onCheckedChange={checked => setSettings(s => ({...s, autoAdvance: checked}))} />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <Label htmlFor="showLeaderboard">Show Leaderboard Between Questions</Label>
                            <Switch id="showLeaderboard" checked={settings.showLeaderboard} onCheckedChange={checked => setSettings(s => ({...s, showLeaderboard: checked}))} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleStartQuiz} disabled={questions.length === 0 || loading} className="w-full md:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4"/>}
                        {loading ? 'Creating Room...' : 'Start Quiz'}
                    </Button>
                </CardFooter>
            </Card>
        )}

        {gameState === 'lobby' && session && (
            <Card>
                <CardHeader>
                    <CardTitle>Lobby</CardTitle>
                    <CardDescription>Players can now join using the room code.</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                     <div className="p-4 bg-primary/10 rounded-lg">
                        <Label>Room Code</Label>
                        <p className="text-6xl font-bold tracking-widest text-primary">{session.roomCode}</p>
                     </div>
                     <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold flex items-center justify-center gap-2"><Users className="h-5 w-5" /> Connected Players ({players.length})</h3>
                        <div className="mt-2 text-sm text-muted-foreground flex flex-wrap gap-2 justify-center">
                            {players.length > 0 ? (
                                players.map(p => <span key={p.id} className="bg-background px-3 py-1 rounded-full">{p.name}</span>)
                            ) : (
                                "Waiting for players to join..."
                            )}
                        </div>
                     </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="destructive">End Quiz</Button>
                    <Button onClick={() => setGameState('active')}>
                        Start First Question <ChevronRight className="ml-2 h-4 w-4"/>
                    </Button>
                </CardFooter>
            </Card>
        )}
        
        {gameState === 'active' && (
             <Card>
                <CardHeader>
                    <CardTitle>Question 1 of {questions.length}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">{questions[0].question}</p>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        {questions[0].answers.map(answer => (
                            <Button variant="outline" key={answer} className="h-auto py-4 text-base">{answer}</Button>
                        ))}
                    </div>
                    <div className="text-center text-6xl font-bold text-primary">30</div>
                </CardContent>
                <CardFooter className="flex justify-between">
                     <Button variant="secondary">Show Results <BarChart className="ml-2 h-4 w-4" /></Button>
                     <Button>Next Question <ChevronRight className="ml-2 h-4 w-4"/></Button>
                </CardFooter>
            </Card>
        )}

        {gameState === 'ended' && (
            <Leaderboard players={[]} />
        )}
    </div>
  );
}

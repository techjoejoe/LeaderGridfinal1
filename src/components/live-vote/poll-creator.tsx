
"use client";

import React, { useState } from 'react';
import type { Poll, PollOption, PollSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ref, update } from "firebase/database";
import { rtdb } from '@/lib/firebase';

type PollCreatorProps = {
  session: PollSession;
};

export function PollCreator({ session }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const { toast } = useToast();

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Question cannot be empty.' });
      return;
    }
    const filledOptions = options.map(o => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must provide at least two options.' });
      return;
    }

    const newPollId = `poll_${Date.now()}`;
    const newPoll: Poll = {
      id: newPollId,
      question,
      options: filledOptions.map((opt, index) => ({
        id: String.fromCharCode(65 + index), // A, B, C...
        text: opt,
        votes: 0,
      })),
      isActive: false,
      createdAt: Date.now(),
    };

    try {
      const sessionRef = ref(rtdb, `live-polls/${session.id}/polls/${newPollId}`);
      await update(ref(rtdb, `live-polls/${session.id}/polls`), { [newPollId]: newPoll });
      
      toast({ title: 'Poll Created!', description: `"${question}" is ready to be activated.` });
      setQuestion('');
      setOptions(['', '']);
    } catch (error) {
      console.error("Error creating poll:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create the poll.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Poll</CardTitle>
        <CardDescription>Enter a question and up to 5 options for your audience to vote on.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">Question</Label>
          <Input id="question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g., Who was the best presenter?" />
        </div>
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
              />
              {options.length > 2 && (
                <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {options.length < 5 && (
            <Button variant="outline" size="sm" onClick={addOption}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit}>Create Poll</Button>
      </CardFooter>
    </Card>
  );
}


"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import type { Poll, PollSession } from '@/lib/types';
import QRCode from 'qrcode.react';

const COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444'
];

function LiveDisplayContent() {
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('sessionCode');
  const [sessionData, setSessionData] = useState<PollSession | null>(null);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);

  useEffect(() => {
    document.body.style.backgroundColor = '#111827';
    return () => {
      document.body.style.backgroundColor = '';
    }
  }, [])
  
  useEffect(() => {
    if (!sessionCode) return;

    const sessionsRef = ref(rtdb, 'live-polls');
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const allSessions = snapshot.val();
      if (allSessions) {
        const matchingSessionId = Object.keys(allSessions).find(id => allSessions[id].code === sessionCode);
        if (matchingSessionId) {
          const session = allSessions[matchingSessionId];
          setSessionData(session);
          if (session.activePollId && session.polls) {
            setActivePoll(session.polls[session.activePollId]);
          } else {
            setActivePoll(null);
          }
        } else {
          setSessionData(null);
          setActivePoll(null);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionCode]);

  const joinUrl = sessionCode ? `${window.location.origin}/livevote?sessionCode=${sessionCode}` : '';

  if (!sessionCode) {
    return <div className="text-white text-3xl text-center p-10">No session code provided.</div>;
  }

  if (!sessionData) {
    return <div className="text-white text-3xl text-center p-10">Searching for session "{sessionCode}"...</div>;
  }

  if (!activePoll) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white text-center p-8 bg-gray-900">
        <h1 className="text-5xl font-bold mb-4">Waiting for the host to start a poll...</h1>
        <p className="text-2xl text-gray-400 mb-8">Join the session by scanning the QR code or visiting the URL below.</p>
        <div className="bg-white p-6 rounded-lg mb-4">
          <QRCode value={joinUrl} size={256} />
        </div>
        <p className="text-3xl font-bold tracking-widest">{sessionData.code}</p>
        <p className="text-lg text-gray-500">{joinUrl}</p>
      </div>
    );
  }

  const totalVotes = activePoll.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div className="h-screen w-screen bg-gray-900 text-white p-12 flex flex-col justify-between">
      <header>
        <h1 className="text-5xl font-bold leading-tight">{activePoll.question}</h1>
      </header>

      <main className="flex-grow flex items-center">
        <div className="w-full space-y-6">
          {activePoll.options.map((option, index) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            return (
              <div key={option.id} className="flex items-center gap-6">
                <span className="text-3xl font-bold w-48 text-right">{option.text}</span>
                <div className="flex-grow bg-gray-700 rounded-full h-16 relative">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length] 
                    }}
                  />
                  <span className="absolute inset-0 flex items-center pl-6 text-3xl font-bold">
                    {Math.round(percentage)}%
                  </span>
                </div>
                <span className="text-3xl font-bold w-32">{option.votes}</span>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-md">
                <QRCode value={joinUrl} size={80} />
            </div>
            <div>
                <p className="font-bold text-lg">Join at:</p>
                <p className="text-2xl font-mono">{joinUrl.replace('https://', '').replace('http://', '')}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="font-bold text-lg">Session Code:</p>
            <p className="text-5xl font-bold tracking-widest">{sessionCode}</p>
        </div>
        <div className="text-right">
             <p className="font-bold text-lg">Total Votes:</p>
             <p className="text-5xl font-bold">{totalVotes}</p>
        </div>
      </footer>
    </div>
  );
}

export default function DisplayPage() {
    return (
        <Suspense fallback={<div className="text-white bg-gray-900 h-screen w-screen flex items-center justify-center">Loading Display...</div>}>
            <LiveDisplayContent />
        </Suspense>
    )
}


"use client";

import React from 'react';
import type { Poll } from '@/lib/types';

type ResultsDisplayProps = {
  poll: Poll;
};

const COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500'
];

export function ResultsDisplay({ poll }: ResultsDisplayProps) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);

  return (
    <div className="space-y-3">
      {poll.options.map((option, index) => {
        const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
        return (
          <div key={option.id} className="w-full">
            <div className="flex justify-between items-center mb-1 text-sm font-medium">
              <span>{option.text}</span>
              <span>{option.votes} vote{option.votes !== 1 && 's'}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-8 relative overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${COLORS[index % COLORS.length]}`}
                style={{ width: `${percentage}%` }}
              ></div>
              <div className="absolute top-0 left-4 h-full flex items-center text-white font-bold text-shadow-sm">
                {percentage > 10 && `${Math.round(percentage)}%`}
              </div>
            </div>
          </div>
        );
      })}
       {totalVotes === 0 && (
         <p className="text-center text-sm text-muted-foreground pt-4">No votes yet.</p>
       )}
    </div>
  );
}

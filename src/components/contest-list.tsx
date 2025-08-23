
"use client";

import { useState, useEffect } from "react";
import type { Contest, PicVoteImage } from "@/lib/types";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import Image from "next/image";
import { Trophy } from "lucide-react";

type ContestListProps = {
  contests: Contest[];
  loading: boolean;
};

function ContestWinnerDisplay({ contestId }: { contestId: string }) {
  const [winners, setWinners] = useState<PicVoteImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const winnersQuery = query(
      collection(db, "images"),
      where("contestId", "==", contestId),
      orderBy("votes", "desc"),
      limit(3)
    );
    const unsubscribe = onSnapshot(winnersQuery, (snapshot) => {
      const winnerData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as PicVoteImage));
      setWinners(winnerData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [contestId]);

  const getMedal = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center gap-4 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
        </div>
    );
  }
  
  if (winners.length === 0) return null;

  return (
    <CardContent>
        <div className="flex items-end justify-center gap-4">
            {winners.map((winner, index) => (
                <div key={winner.id} className="flex flex-col items-center text-center">
                    <span className="text-2xl">{getMedal(index)}</span>
                    <Image
                        src={winner.url}
                        alt={winner.name}
                        width={index === 0 ? 64 : 48}
                        height={index === 0 ? 64 : 48}
                        className="rounded-full object-cover border-2 border-card"
                    />
                    <p className="text-xs font-semibold mt-1 truncate max-w-16">{winner.name}</p>
                </div>
            ))}
        </div>
    </CardContent>
  )
}

export function ContestList({ contests, loading }: ContestListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-12 w-12 rounded-full" />
                </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (contests.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <h3 className="text-2xl font-bold font-headline">No contests yet!</h3>
        <p className="text-muted-foreground mt-2">Be the first to create one.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contests.map((contest) => (
        <Card key={contest.id} className="flex flex-col transition-all hover:shadow-lg">
          <Link href={`/picpick?contestId=${contest.id}`} className="flex-grow flex flex-col">
            <CardHeader className="flex-grow">
              <CardTitle>{contest.name}</CardTitle>
              <CardDescription>
                Created by {contest.creatorName}
                {contest.createdAt && 
                  ` - ${formatDistanceToNow(contest.createdAt.toDate(), { addSuffix: true })}`}
              </CardDescription>
            </CardHeader>
            <ContestWinnerDisplay contestId={contest.id} />
          </Link>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/leaderboard?contestId=${contest.id}`}>
                <Trophy className="mr-2 h-4 w-4" />
                View Leaderboard
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

    
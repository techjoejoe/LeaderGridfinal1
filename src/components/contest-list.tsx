
"use client";

import { useState, useEffect } from "react";
import type { Contest, PicVoteImage } from "@/lib/types";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import Image from "next/image";

type ContestListProps = {
  contests: Contest[];
  loading: boolean;
};

function ContestWinnerDisplay({ contestId }: { contestId: string }) {
  const [winners, setWinners] = useState<PicVoteImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const imagesQuery = query(
      collection(db, "images"),
      where("contestId", "==", contestId)
    );
    const unsubscribe = onSnapshot(imagesQuery, (snapshot) => {
      const allImages = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as PicVoteImage));
      const sortedWinners = allImages.sort((a, b) => b.votes - a.votes).slice(0, 3);
      setWinners(sortedWinners);
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

function ContestCard({ contest }: { contest: Contest }) {
  return (
      <Card className="flex flex-col transition-all hover:shadow-lg">
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
        <CardFooter className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full">
              <Link href={`/picpick?contestId=${contest.id}`}>
                View Contest
              </Link>
            </Button>
            <Button asChild className="w-full" variant="secondary">
               <Link href={`/leaderboard?contestId=${contest.id}`}>
                View Leaderboard
              </Link>
            </Button>
        </CardFooter>
      </Card>
  );
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
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-10 w-full" />
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
        <div key={contest.id} className="flex flex-col">
            <ContestCard contest={contest} />
        </div>
      ))}
    </div>
  );
}

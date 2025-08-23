
"use client";

import type { Contest } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';

type ContestListProps = {
  contests: Contest[];
  loading: boolean;
};

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
            <CardFooter>
              <Skeleton className="h-10 w-24" />
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
        <Card key={contest.id} className="flex flex-col">
          <CardHeader className="flex-grow">
            <CardTitle>{contest.name}</CardTitle>
            <CardDescription>
              Created by {contest.creatorName}
              {contest.createdAt && 
                ` - ${formatDistanceToNow(contest.createdAt.toDate(), { addSuffix: true })}`}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href={`/picpick?contestId=${contest.id}`}>Join Contest</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import type { Contest, PicVoteImage } from "@/lib/types";
import { User } from "firebase/auth";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from 'date-fns';
import Image from "next/image";
import { Trash2, Share2, Calendar } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";

type ContestListProps = {
  contests: Contest[];
  loading: boolean;
  user: User | null;
  onDeleteContest: (contestId: string) => void;
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

function ContestCard({ contest, user, onDeleteContest }: { contest: Contest, user: User | null, onDeleteContest: (contestId: string) => void }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isCreator = user?.uid === contest.creatorUid;
  const { toast } = useToast();

  const handleShare = () => {
    const contestUrl = `${window.location.origin}/picpick?contestId=${contest.id}`;
    navigator.clipboard.writeText(contestUrl)
      .then(() => {
        toast({
          title: "Link Copied!",
          description: "Contest link copied to your clipboard.",
        });
      })
      .catch(err => {
        console.error("Failed to copy link:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not copy link. Please try again.",
        });
      });
  };

  return (
    <>
      <Card className="flex flex-col transition-all hover:shadow-lg">
        <Link href={`/picpick?contestId=${contest.id}`} className="flex-grow flex flex-col">
          <CardHeader className="flex-grow">
            <CardTitle>{contest.name}</CardTitle>
            <CardDescription>
              Created by {contest.creatorName}
            </CardDescription>
            {contest.startDate && contest.endDate && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                <Calendar className="h-3 w-3" />
                <span>{format(contest.startDate.toDate(), "MMM d")}</span>
                <span>-</span>
                <span>{format(contest.endDate.toDate(), "MMM d, yyyy")}</span>
              </div>
            )}
          </CardHeader>
          <ContestWinnerDisplay contestId={contest.id} />
        </Link>
        <CardFooter className="flex gap-2">
            <Button asChild className="w-full">
              <Link href={`/picpick?contestId=${contest.id}`}>
                View Contest
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleShare}
              aria-label="Share contest"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {isCreator && (
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={() => setIsDeleteDialogOpen(true)}
                aria-label="Delete contest"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
        </CardFooter>
      </Card>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              contest "{contest.name}" and all of its images and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDeleteContest(contest.id)} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


export function ContestList({ contests, loading, user, onDeleteContest }: ContestListProps) {
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
            <ContestCard contest={contest} user={user} onDeleteContest={onDeleteContest} />
        </div>
      ))}
    </div>
  );
}

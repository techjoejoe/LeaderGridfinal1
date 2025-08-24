
"use client";

import { useState, useEffect } from "react";
import type { Contest, PicVoteImage } from "@/lib/types";
import { User } from "firebase/auth";
import { collection, query, onSnapshot, where, doc, getDoc, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import Image from "next/image";
import { Trash2, Share2, Calendar, Lock } from "lucide-react";
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
import { PasswordPromptDialog } from "@/components/password-prompt-dialog";

type ContestListProps = {
  contests: Contest[];
  loading: boolean;
  user: User | null;
  onDeleteContest: (contestId: string) => void;
};

type ContestWithWinners = Contest & { winners?: PicVoteImage[] };


function ContestCard({ contest, user, onDeleteContest }: { contest: ContestWithWinners, user: User | null, onDeleteContest: (contestId: string) => void }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const isCreator = user?.uid === contest.creatorUid;
  const isClassContest = !!contest.classId;
  const viewUrl = `/picpick?contestId=${contest.id}`;

  const getMedal = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return null;
  }

  const handleShare = () => {
    const contestUrl = `${window.location.origin}${viewUrl}`;
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

  const handleNavigation = (targetUrl: string) => {
    const sessionKey = `contest_access_${contest.id}`;
    if (contest.hasPassword && sessionStorage.getItem(sessionKey) !== 'granted') {
      setIsPasswordPromptOpen(true);
    } else {
      router.push(targetUrl);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    const contestRef = doc(db, "contests", contest.id);
    const contestDoc = await getDoc(contestRef);
    if (contestDoc.exists() && contestDoc.data().password === password) {
      const sessionKey = `contest_access_${contest.id}`;
      sessionStorage.setItem(sessionKey, 'granted');
      setIsPasswordPromptOpen(false);
      router.push(viewUrl);
    } else {
      toast({
        variant: "destructive",
        title: "Incorrect Password",
        description: "The password you entered is incorrect.",
      });
    }
  };

  return (
    <>
      <Card className="flex flex-col transition-all hover:shadow-lg">
        <div onClick={() => handleNavigation(viewUrl)} className="flex-grow flex flex-col cursor-pointer">
          <CardHeader className="flex-grow">
            <div className="flex justify-between items-start">
              <CardTitle>{contest.name}</CardTitle>
              {contest.hasPassword && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
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
           {contest.winners && contest.winners.length > 0 && (
            <CardContent>
                <div className="flex items-end justify-center gap-4">
                    {contest.winners.map((winner, index) => (
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
           )}
        </div>
        <CardFooter className="flex gap-2">
            <Button onClick={() => handleNavigation(viewUrl)} className="w-full">
              View Contest
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
      <PasswordPromptDialog
        isOpen={isPasswordPromptOpen}
        onOpenChange={setIsPasswordPromptOpen}
        onSubmit={handlePasswordSubmit}
        contestName={contest.name}
      />
    </>
  );
}


export function ContestList({ contests, loading, user, onDeleteContest }: ContestListProps) {
  const [contestsWithWinners, setContestsWithWinners] = useState<ContestWithWinners[]>([]);

  useEffect(() => {
    const unsubscribers = contests.map(contest => {
      const q = query(
        collection(db, "images"),
        where("contestId", "==", contest.id),
        orderBy("votes", "desc"),
        limit(3)
      );

      return onSnapshot(q, (snapshot) => {
        const winners = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PicVoteImage));
        
        setContestsWithWinners(prevContests => {
          const newContests = [...prevContests];
          const contestIndex = newContests.findIndex(c => c.id === contest.id);
          const updatedContest = { ...contest, winners };
          
          if (contestIndex > -1) {
            newContests[contestIndex] = updatedContest;
          } else {
            newContests.push(updatedContest);
          }
          // Sort by creation date after update
          return newContests.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        });
      });
    });

    // When contests list changes, update our internal state
    setContestsWithWinners(contests.map(c => ({...c, winners: []})));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [contests]);
  
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
      {contestsWithWinners.map((contest) => (
        <div key={contest.id} className="flex flex-col">
            <ContestCard contest={contest} user={user} onDeleteContest={onDeleteContest} />
        </div>
      ))}
    </div>
  );
}


"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, getDoc, writeBatch } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import type { PicVoteImage, DailyVoteInfo } from "@/lib/types";
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Header } from "@/components/header";
import { ImageCard } from "@/components/image-card";
import { UploadDialog } from "@/components/upload-dialog";
import { LeaderboardDialog } from "@/components/leaderboard-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/sign-in-dialog";
import { Trophy } from "lucide-react";

const DAILY_VOTE_LIMIT = 10;

export default function Home() {
  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [dailyVoteInfo, setDailyVoteInfo] = useState<DailyVoteInfo>({ votesLeft: DAILY_VOTE_LIMIT, votedImageIds: [] });
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isLeaderboardOpen, setLeaderboardOpen] = useState(false);
  const [isSignInOpen, setSignInOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [votingImageId, setVotingImageId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setSignInOpen(false); // Close sign-in dialog on successful login
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserVoteInfo = useCallback(async (userId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const userVoteDocRef = doc(db, "userVotes", `${userId}_${today}`);
    const userVoteDoc = await getDoc(userVoteDocRef);

    if (userVoteDoc.exists()) {
      setDailyVoteInfo(userVoteDoc.data() as DailyVoteInfo);
    } else {
      setDailyVoteInfo({ votesLeft: DAILY_VOTE_LIMIT, votedImageIds: [] });
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserVoteInfo(user.uid);
    } else {
      // Not logged in, show default state but disable voting
      setDailyVoteInfo({ votesLeft: DAILY_VOTE_LIMIT, votedImageIds: [] });
    }
  }, [user, fetchUserVoteInfo]);


  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "images"), (snapshot) => {
      const imagesData = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as PicVoteImage)
      );
      setImages(imagesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching images:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch images from the database.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleVote = async (id: string) => {
    if (!user) {
      setSignInOpen(true);
      return;
    }

    if (dailyVoteInfo.votesLeft <= 0) {
      toast({
        variant: "destructive",
        title: "No Votes Left!",
        description: "You have used all your votes for today. Come back tomorrow!",
      });
      return;
    }

    if (dailyVoteInfo.votedImageIds.includes(id)) {
      toast({
        variant: "destructive",
        title: "Already Voted!",
        description: "You have already voted for this image today.",
      });
      return;
    }
    
    setVotingImageId(id);

    const imageRef = doc(db, "images", id);
    const image = images.find(img => img.id === id);

    if (image) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const userVoteDocRef = doc(db, "userVotes", `${user.uid}_${today}`);
        
        const newVotesLeft = dailyVoteInfo.votesLeft - 1;
        const newVotedImageIds = [...dailyVoteInfo.votedImageIds, id];
        
        const newVoteData: DailyVoteInfo = {
          votesLeft: newVotesLeft,
          votedImageIds: newVotedImageIds,
        };

        const batch = writeBatch(db);
        batch.update(imageRef, { votes: image.votes + 1 });
        batch.set(userVoteDocRef, newVoteData, { merge: true });
        await batch.commit();
        
        setDailyVoteInfo(newVoteData);
        
        toast({
          title: "Vote Cast!",
          description: `Your vote has been counted. You have ${newVotesLeft} votes left today.`,
        });
      } catch (error) {
        console.error("Error updating votes:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not cast your vote. Please try again.",
        });
      } finally {
        setVotingImageId(null);
      }
    }
  };

  const handleUpload = async (imageName: string, dataUrl: string) => {
    if (!user) {
      setSignInOpen(true);
      setUploadOpen(false);
      return;
    }

    setUploadOpen(false);
    toast({
      title: "Uploading Image...",
      description: "Please wait while your image is being uploaded.",
    });

    try {
      const newImageDocRef = doc(collection(db, "images"));
      const newImageId = newImageDocRef.id;

      const storageRef = ref(storage, `images/${newImageId}.png`);
      
      const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);

      const nameParts = user.displayName?.split(" ") || ["Anonymous"];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      
      const newImage: Omit<PicVoteImage, 'id'> = {
        name: imageName,
        firstName: firstName,
        lastName: lastName,
        url: downloadURL,
        votes: 0,
        uploaderUid: user.uid,
      };

      await setDoc(newImageDocRef, newImage);
      
      toast({
        title: "Image Uploaded!",
        description: `${imageName} is now in the running.`,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload your image. Please try again.",
      });
    }
  };

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => b.votes - a.votes);
  }, [images]);

  const hasVotedForImage = (id: string) => dailyVoteInfo.votedImageIds.includes(id);

  const podiumImages = sortedImages.slice(0, 3);
  const otherImages = sortedImages.slice(3);

  const displayedPodium = useMemo(() => {
    if (podiumImages.length < 3) return podiumImages.map((image, index) => ({ image, rank: index }));
    const podiumMap = [
      { image: podiumImages[1], rank: 1 }, // 2nd place
      { image: podiumImages[0], rank: 0 }, // 1st place
      { image: podiumImages[2], rank: 2 }, // 3rd place
    ];
    return podiumMap;
  }, [podiumImages]);

  const voteDisabled = !user || dailyVoteInfo.votesLeft <= 0;
  const onUploadClick = () => user ? setUploadOpen(true) : setSignInOpen(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        user={user}
        onLeaderboardClick={() => setLeaderboardOpen(true)}
        onSignInClick={() => setSignInOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="w-full">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-3xl font-headline font-bold">Team Matty AI Badge Contest</h2>
                <Button onClick={onUploadClick} disabled={!user} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Trophy className="mr-2 h-4 w-4" />
                  Enter Contest
                </Button>
              </div>
               {user ? (
                  <p className="text-lg text-muted-foreground">
                      You have <span className="font-bold text-primary">{dailyVoteInfo.votesLeft}</span> votes left today.
                  </p>
               ) : (
                  <p className="text-lg text-muted-foreground">Please sign in to vote or upload an image.</p>
               )}
            </div>
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                    <div className="rounded-full border-4 border-card shadow-lg aspect-square w-full bg-muted animate-pulse"></div>
                    <div className="w-3/4 h-4 bg-muted animate-pulse rounded"></div>
                        <div className="w-1/2 h-4 bg-muted animate-pulse rounded"></div>
                    </div>
                ))}
                </div>
            ) : (
                <>
                {images.length > 0 ? (
                    <div className="flex flex-col gap-8">
                      {podiumImages.length > 0 && (
                          <div className="flex justify-center items-end gap-4 md:gap-8 mb-8 border-b pb-8 pt-12 min-h-[320px]">
                          {displayedPodium.map(({ image, rank }) => (
                              <ImageCard
                              key={image.id}
                              image={image}
                              rank={rank}
                              onVote={handleVote}
                              disabled={voteDisabled || hasVotedForImage(image.id)}
                              hasVoted={hasVotedForImage(image.id)}
                              isVoting={votingImageId === image.id}
                              />
                          ))}
                          </div>
                      )}
                      {otherImages.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end">
                          {otherImages.map((image, index) => (
                              <ImageCard
                              key={image.id}
                              image={image}
                              rank={index + 3}
                              onVote={handleVote}
                              disabled={voteDisabled || hasVotedForImage(image.id)}
                              hasVoted={hasVotedForImage(image.id)}
                              isVoting={votingImageId === image.id}
                              />
                          ))}
                          </div>
                      )}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-2xl font-bold font-headline">No images yet!</h3>
                    <p className="text-muted-foreground mt-2">Be the first to upload a picture.</p>
                    </div>
                )}
                </>
            )}
        </div>
      </main>
      <UploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
      />
      <LeaderboardDialog
        isOpen={isLeaderboardOpen}
        onOpenChange={setLeaderboardOpen}
        images={sortedImages}
      />
      <SignInDialog
        isOpen={isSignInOpen}
        onOpenChange={setSignInOpen}
      />
    </div>
  );
}


"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { PicVoteImage } from "@/lib/types";
import { Header } from "@/components/header";
import { ImageCard } from "@/components/image-card";
import { UploadDialog } from "@/components/upload-dialog";
import { LeaderboardDialog } from "@/components/leaderboard-dialog";
import { useToast } from "@/hooks/use-toast";

const DAILY_VOTE_LIMIT = 10;

type DailyVoteInfo = {
  votesLeft: number;
  votedImageIds: string[];
};

export default function Home() {
  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [dailyVoteInfo, setDailyVoteInfo] = useState<DailyVoteInfo>({ votesLeft: DAILY_VOTE_LIMIT, votedImageIds: [] });
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isLeaderboardOpen, setLeaderboardOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [votingImageId, setVotingImageId] = useState<string | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    const voteDataString = localStorage.getItem("picvote_daily_votes");
    const today = new Date().toISOString().split("T")[0];

    if (voteDataString) {
      try {
        const voteData = JSON.parse(voteDataString);
        if (voteData.date === today) {
          setDailyVoteInfo({
            votesLeft: voteData.votesLeft,
            votedImageIds: voteData.votedImageIds,
          });
        } else {
          // New day, reset votes
          localStorage.removeItem("picvote_daily_votes");
          setDailyVoteInfo({ votesLeft: DAILY_VOTE_LIMIT, votedImageIds: [] });
        }
      } catch (e) {
        // Corrupted data, reset
         localStorage.removeItem("picvote_daily_votes");
         setDailyVoteInfo({ votesLeft: DAILY_VOTE_LIMIT, votedImageIds: [] });
      }
    } else {
        setDailyVoteInfo({ votesLeft: DAILY_VOTE_LIMIT, votedImageIds: [] });
    }
  }, []);

  const handleVote = async (id: string) => {
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
        await updateDoc(imageRef, { votes: image.votes + 1 });
        
        const newVotesLeft = dailyVoteInfo.votesLeft - 1;
        const newVotedImageIds = [...dailyVoteInfo.votedImageIds, id];
        
        const today = new Date().toISOString().split("T")[0];
        const newVoteData = {
          date: today,
          votesLeft: newVotesLeft,
          votedImageIds: newVotedImageIds
        };
        
        localStorage.setItem("picvote_daily_votes", JSON.stringify(newVoteData));
        setDailyVoteInfo({ votesLeft: newVotesLeft, votedImageIds: newVotedImageIds });
        
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

  const handleUpload = async (imageName: string, firstName: string, lastName: string, dataUrl: string) => {
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
      
      const newImage: Omit<PicVoteImage, 'id'> = {
        name: imageName,
        firstName: firstName,
        lastName: lastName,
        url: downloadURL,
        votes: 0,
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

  const handleResetVotes = () => {
    localStorage.removeItem("picvote_daily_votes");
    setDailyVoteInfo({ votesLeft: DAILY_VOTE_LIMIT, votedImageIds: [] });
    toast({
      title: "Votes Reset",
      description: "You can now vote again.",
    });
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        onUploadClick={() => setUploadOpen(true)} 
        onResetVotesClick={handleResetVotes}
        onLeaderboardClick={() => setLeaderboardOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-3xl font-headline font-bold">Team Matty AI Badge Contest</h2>
                <p className="text-lg text-muted-foreground mt-1">
                    You have <span className="font-bold text-primary">{dailyVoteInfo.votesLeft}</span> votes left today.
                </p>
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
                              disabled={dailyVoteInfo.votesLeft <= 0 || hasVotedForImage(image.id)}
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
                              disabled={dailyVoteInfo.votesLeft <= 0 || hasVotedForImage(image.id)}
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
    </div>
  );
}

    
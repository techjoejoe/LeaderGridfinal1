
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, getDoc, writeBatch } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { PicVoteImage } from "@/lib/types";
import { Header } from "@/components/header";
import { ImageCard } from "@/components/image-card";
import { UploadDialog } from "@/components/upload-dialog";
import { LeaderboardDialog } from "@/components/leaderboard-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Trophy, Award } from "lucide-react";
import Link from "next/link";


export default function Home() {
  const [images, setImages] = useState<PicVoteImage[]>([]);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isLeaderboardOpen, setLeaderboardOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [votingImageId, setVotingImageId] = useState<string | null>(null);


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
    setVotingImageId(id);

    const imageRef = doc(db, "images", id);
    const image = images.find(img => img.id === id);

    if (image) {
      try {
        await updateDoc(imageRef, { votes: image.votes + 1 });
        toast({
          title: "Vote Cast!",
          description: `Your vote for ${image.name} has been counted.`,
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
        firstName: "Anonymous",
        lastName: "",
        url: downloadURL,
        votes: 0,
        uploaderUid: "anonymous",
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
  
  const onUploadClick = () => {
    setUploadOpen(true)
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        onLeaderboardClick={() => setLeaderboardOpen(true)}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="w-full">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-3xl font-headline font-bold">Team Matty AI Badge Contest</h2>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline">
                    <Link href="https://docs.paylocity.com/Madlib/teamMatty.html" target="_blank">
                      <Award className="mr-2 h-4 w-4" />
                      Make a Badge
                    </Link>
                  </Button>
                  <Button onClick={onUploadClick} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Trophy className="mr-2 h-4 w-4" />
                    Enter Contest
                  </Button>
                </div>
              </div>
               <p className="text-lg text-muted-foreground">Vote for your favorite badge design!</p>
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
                              disabled={false}
                              hasVoted={false}
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
                              disabled={false}
                              hasVoted={false}
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

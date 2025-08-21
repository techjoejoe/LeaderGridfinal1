"use client";

import { useState, useEffect, useMemo } from "react";
import type { PicVoteImage } from "@/lib/types";
import { INITIAL_IMAGES } from "@/lib/mock-data";
import { Header } from "@/components/header";
import { ImageCard } from "@/components/image-card";
import { Leaderboard } from "@/components/leaderboard";
import { UploadDialog } from "@/components/upload-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [images, setImages] = useState<PicVoteImage[]>(INITIAL_IMAGES);
  const [hasVoted, setHasVoted] = useState(true); // Default to true, check on mount
  const [isUploadOpen, setUploadOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const lastVoteDate = localStorage.getItem("picvote_last_vote");
    if (lastVoteDate) {
      const today = new Date().toISOString().split("T")[0];
      if (lastVoteDate === today) {
        setHasVoted(true);
      } else {
        setHasVoted(false);
      }
    } else {
      setHasVoted(false);
    }
  }, []);

  const handleVote = (id: string) => {
    if (hasVoted) {
      toast({
        variant: "destructive",
        title: "Already Voted!",
        description: "You can only vote once per day. Come back tomorrow!",
      });
      return;
    }

    setImages((prevImages) =>
      prevImages.map((img) =>
        img.id === id ? { ...img, votes: img.votes + 1 } : img
      )
    );

    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem("picvote_last_vote", today);
    setHasVoted(true);

    toast({
      title: "Vote Cast!",
      description: "Your vote has been counted. Thank you!",
    });
  };

  const handleUpload = (name: string, url: string) => {
    const newImage: PicVoteImage = {
      id: crypto.randomUUID(),
      name,
      url,
      votes: 0,
    };
    setImages((prevImages) => [newImage, ...prevImages]);
    setUploadOpen(false);
    toast({
      title: "Image Uploaded!",
      description: `${name} is now in the running.`,
    });
  };

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => b.votes - a.votes);
  }, [images]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onUploadClick={() => setUploadOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-headline font-bold">Image Gallery</h2>
              {hasVoted && (
                 <p className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">You've voted today. Come back tomorrow!</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {images.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onVote={handleVote}
                  disabled={hasVoted}
                />
              ))}
            </div>
          </div>
          <aside className="lg:w-1/4">
            <Leaderboard images={sortedImages} />
          </aside>
        </div>
      </main>
      <UploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
      />
    </div>
  );
}


"use client";

import Image from "next/image";
import { useState } from "react";
import { Vote, Check, Loader2 } from "lucide-react";
import type { PicVoteImage, ContestImageShape } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles } from "@/components/sparkles";
import { Confetti } from "@/components/confetti";


type ImageCardProps = {
  image: PicVoteImage;
  onVote: (id: string) => void;
  disabled: boolean;
  hasVoted: boolean;
  rank: number;
  isVoting: boolean;
  imageShape?: ContestImageShape;
};

export function ImageCard({ image, onVote, disabled, hasVoted, rank, isVoting, imageShape = 'circular' }: ImageCardProps) {
  const isPodium = rank < 3;
  const [showConfetti, setShowConfetti] = useState(false);

  const shapeClasses = {
    circular: 'rounded-full',
    square: 'rounded-md',
    original: 'rounded-lg'
  };

  const podiumClasses = {
    container: cn("drop-shadow-lg", {
        "z-20": rank === 0,
        "z-10": rank === 1,
        "self-end": rank === 1 || rank === 2,
    }),
    imageContainer: cn(
        "relative shadow-2xl transition-all p-1",
        shapeClasses[imageShape],
        {
            "w-48 h-48 md:w-60 md:h-60": rank === 0 && (imageShape === 'circular' || imageShape === 'square'),
            "w-36 h-36 md:w-44 md:h-44": rank === 1 && (imageShape === 'circular' || imageShape === 'square'),
            "w-32 h-32 md:w-36 md:h-36": rank === 2 && (imageShape === 'circular' || imageShape === 'square'),
            "w-48 md:w-60": rank === 0 && imageShape === 'original',
            "w-36 md:w-44": rank === 1 && imageShape === 'original',
            "w-32 md:w-36": rank === 2 && imageShape === 'original',
            "overflow-visible": rank === 0,
            "aspect-square": imageShape === 'circular' || imageShape === 'square',
        }
    ),
    imageBorder: cn("border-4 w-full h-full", shapeClasses[imageShape], {
      "border-transparent": rank === 0,
      "border-silver dark:shadow-[0_0_15px_2px_hsl(var(--silver))]": rank === 1,
      "border-bronze dark:shadow-[0_0_15px_2px_hsl(var(--bronze))]": rank === 2,
    }),
  };

  const nonPodiumClasses = {
      imageContainer: cn(
        "shadow-2xl p-1 drop-shadow-lg transition-all duration-300 dark:shadow-primary-foreground/10 dark:hover:shadow-primary-foreground/20", 
        shapeClasses[imageShape],
        {
          "w-32 h-32 md:w-36 md:h-36": (imageShape === 'circular' || imageShape === 'square'),
          "w-32 md:w-36": imageShape === 'original'
        }
      ),
      imageBorder: cn("border-4 border-card w-full h-full", shapeClasses[imageShape])
  };

  const handleVoteClick = () => {
    setShowConfetti(true);
    onVote(image.id);
  }

  const imageSizes = isPodium 
    ? "(max-width: 768px) 30vw, 240px" 
    : "(max-width: 768px) 25vw, (max-width: 1200px) 15vw, 144px";

  return (
    <div className={cn("flex flex-col items-center gap-3 relative", isPodium ? podiumClasses.container : "")}>
      {rank === 0 && (
        <span className="absolute -top-24 text-9xl transform -rotate-12 animate-float z-20 drop-shadow-lg" role="img" aria-label="crown">👑</span>
      )}
      <div 
        className={cn(
          "relative group transition-transform duration-300",
          isPodium ? "hover:scale-105" : "hover:scale-125",
          isPodium ? podiumClasses.imageContainer : nonPodiumClasses.imageContainer,
           isVoting && "animate-pulse-glow"
        )}
      >
        <div className="absolute inset-0 z-0">
          <div className={cn(
              "w-full h-full",
              shapeClasses[imageShape],
              { "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 dark:shadow-[0_0_25px_5px_hsl(var(--gold))]": rank === 0 }
          )} />
        </div>
        <div className={cn(
          "relative",
           isPodium ? podiumClasses.imageBorder : nonPodiumClasses.imageBorder
        )}>
            <div className={cn("w-full h-full relative bg-card shadow-lg", shapeClasses[imageShape], { 'overflow-hidden': rank !== 0 || imageShape !== 'circular' })}>
                {rank < 3 && (
                  <Sparkles
                    color={rank === 0 ? '#FFC700' : rank === 1 ? '#C0C0C0' : '#CD7F32'}
                  />
                )}
                <Image
                    src={image.url}
                    alt={image.name ?? 'photo'}
                    fill
                    className={cn("object-cover p-1", shapeClasses[imageShape])}
                    sizes={imageSizes}
                    data-ai-hint={image.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
                />
            </div>
        </div>
      </div>
      <div className="text-center w-36 relative">
        <p className="font-bold truncate text-sm" title={image.name}>{image.name}</p>
        <p className="text-xs text-muted-foreground truncate" title={`by ${image.firstName || 'Anonymous'}`}>by {image.firstName || 'Anonymous'}</p>
        <Button onClick={handleVoteClick} disabled={disabled || isVoting} size="sm" className="w-full mt-2" variant={"outline"}>
            {isVoting ? <Loader2 className="animate-spin" /> : <Vote />}
            {isVoting ? "Voting..." : `Vote (${image.votes})`}
        </Button>
         {showConfetti && (
          <Confetti onAnimationComplete={() => setShowConfetti(false)} />
        )}
      </div>
    </div>
  );
}

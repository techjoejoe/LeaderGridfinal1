
"use client";

import Image from "next/image";
import { Vote, Check } from "lucide-react";
import type { PicVoteImage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageCardProps = {
  image: PicVoteImage;
  onVote: (id: string) => void;
  disabled: boolean;
  hasVoted: boolean;
  rank: number;
};

export function ImageCard({ image, onVote, disabled, hasVoted, rank }: ImageCardProps) {
  const isPodium = rank < 3;

  const podiumClasses = {
    container: cn({
        "scale-125 z-10": rank === 0,
        "scale-100": rank === 1,
        "scale-100": rank === 2,
        "self-start": rank === 1 || rank === 2,
        "relative top-8": rank === 1 || rank === 2,
    }),
    imageBorder: cn({
      "border-gold": rank === 0,
      "border-silver": rank === 1,
      "border-bronze": rank === 2,
      "border-card": !isPodium,
    }),
  };

  return (
    <div className={cn("flex flex-col items-center gap-3 transition-all hover:-translate-y-1 relative", isPodium ? podiumClasses.container : "")}>
      {rank === 0 && (
        <span className="absolute -top-10 text-5xl transform -rotate-12" role="img" aria-label="crown">👑</span>
      )}
      <div 
        className={cn(
          "relative aspect-square w-24 md:w-32 rounded-full border-4 shadow-md overflow-hidden",
          podiumClasses.imageBorder
        )}
      >
        <Image
          src={image.url}
          alt={image.name ?? 'photo'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 30vw, 10vw"
          data-ai-hint={image.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
        />
      </div>
      <div className="text-center">
        <p className="font-bold truncate text-sm" title={image.name}>{image.name}</p>
        <p className="text-xs text-muted-foreground truncate" title={`by ${image.userName || 'Anonymous'}`}>by {image.userName || 'Anonymous'}</p>
        <Button onClick={() => onVote(image.id)} disabled={disabled} size="sm" className="w-full mt-2" variant={hasVoted ? "secondary" : "outline"}>
          {hasVoted ? <Check className="mr-2" /> : <Vote className="mr-2" />}
          {hasVoted ? "Voted" : `Vote (${image.votes})`}
        </Button>
      </div>
    </div>
  );
}

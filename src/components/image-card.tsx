
"use client";

import Image from "next/image";
import { Vote } from "lucide-react";
import type { PicVoteImage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ImageCardProps = {
  image: PicVoteImage;
  onVote: (id: string) => void;
  disabled: boolean;
};

export function ImageCard({ image, onVote, disabled }: ImageCardProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative aspect-square w-full">
            <Image
                src={image.url}
                alt={image.name ?? 'photo'}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16.6vw"
                data-ai-hint={image.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
            />
        </div>
        <div className="p-3">
             <p className="font-bold truncate text-sm" title={image.name}>{image.name}</p>
            <p className="text-xs text-muted-foreground truncate" title={`by ${image.userName || 'Anonymous'}`}>by {image.userName || 'Anonymous'}</p>
            <Button onClick={() => onVote(image.id)} disabled={disabled} size="sm" className="w-full mt-2" variant="outline">
                <Vote className="mr-2" />
                Vote ({image.votes})
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

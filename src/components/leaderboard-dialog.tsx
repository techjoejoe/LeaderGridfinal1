
"use client";

import type { PicVoteImage } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

type LeaderboardDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  images: PicVoteImage[];
};

export function LeaderboardDialog({ isOpen, onOpenChange, images }: LeaderboardDialogProps) {
  
  const getMedal = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return rank + 1;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Contest Leaderboard</DialogTitle>
          <DialogDescription>
            See who's in the lead. The rankings are updated in real-time.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-6">Rank</TableHead>
                <TableHead className="px-6">Contestant</TableHead>
                <TableHead className="text-right px-6">Votes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {images.map((image, index) => (
                <TableRow key={image.id}>
                  <TableCell className="font-bold text-lg text-center px-6">{getMedal(index)}</TableCell>
                  <TableCell className="px-6">
                      <div className="flex items-center gap-3">
                        <Image src={image.url} alt={image.name} width={40} height={40} className="rounded-full object-cover" />
                        <div>
                            <p className="font-medium truncate">{image.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{image.firstName} {image.lastName}</p>
                        </div>
                      </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg px-6">{image.votes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

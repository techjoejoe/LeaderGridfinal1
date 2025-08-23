
"use client";

import type { PicVoteImage } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeaderboardTable } from "./leaderboard-table";

type LeaderboardDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  images: PicVoteImage[];
};

export function LeaderboardDialog({ isOpen, onOpenChange, images }: LeaderboardDialogProps) {
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
          <LeaderboardTable images={images} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import type { PicVoteImage } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";

type LeaderboardTableProps = {
  images: PicVoteImage[];
};

export function LeaderboardTable({ images }: LeaderboardTableProps) {
  
  const getMedal = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return rank + 1;
  }

  return (
    <Table>
        <TableHeader>
            <TableRow>
            <TableHead className="w-16 px-6 text-center">Rank</TableHead>
            <TableHead className="px-6">Contestant</TableHead>
            <TableHead className="text-right px-6">Votes</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {images.map((image, index) => (
            <TableRow key={image.id}>
                <TableCell className="font-bold text-lg text-center px-6">{getMedal(index)}</TableCell>
                <TableCell className="px-6 py-3">
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
  );
}

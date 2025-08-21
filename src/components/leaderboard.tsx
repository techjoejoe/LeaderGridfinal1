
import Image from "next/image";
import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PicVoteImage } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";

type LeaderboardProps = {
  images: PicVoteImage[];
};

export function Leaderboard({ images }: LeaderboardProps) {
  const topImages = images.slice(0, 10);

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Trophy className="text-amber-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topImages.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/6 text-center">Rank</TableHead>
                  <TableHead className="w-4/6">Image</TableHead>
                  <TableHead className="w-1/6 text-right">Votes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topImages.map((image, index) => (
                  <TableRow key={image.id}>
                    <TableCell className="font-bold text-lg text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-md overflow-hidden relative flex-shrink-0">
                          <Image
                            src={image.url}
                            alt={image.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                            data-ai-hint={image.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
                          />
                        </div>
                        <div>
                          <p className="truncate font-medium">{image.name}</p>
                          <p className="text-xs text-muted-foreground truncate">by {image.userName || 'Anonymous'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {image.votes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-4">No images to display.</p>
        )}
      </CardContent>
    </Card>
  );
}

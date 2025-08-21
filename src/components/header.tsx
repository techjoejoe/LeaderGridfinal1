import { Vote, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  onUploadClick: () => void;
};

export function Header({ onUploadClick }: HeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Vote className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-card-foreground">
            PicVote
          </h1>
        </div>
        <Button onClick={onUploadClick} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Upload className="mr-2 h-4 w-4" />
          Upload Image
        </Button>
      </div>
    </header>
  );
}

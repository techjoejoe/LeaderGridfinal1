
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateContestDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: (contestName: string) => void;
};

export function CreateContestDialog({ isOpen, onOpenChange, onCreate }: CreateContestDialogProps) {
  const [contestName, setContestName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!contestName.trim()) {
      setError("Contest name is required.");
      return;
    }
    setError("");
    onCreate(contestName);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setContestName("");
      setError("");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Create a New Contest</DialogTitle>
          <DialogDescription>
            Give your new photo contest a name to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contestName">Contest Name</Label>
            <Input
              id="contestName"
              value={contestName}
              onChange={(e) => setContestName(e.target.value)}
              placeholder="e.g., 'Summer Adventures'"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Start Contest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

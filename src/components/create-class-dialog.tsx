
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

type CreateClassDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: (className: string) => void;
};

export function CreateClassDialog({ isOpen, onOpenChange, onCreate }: CreateClassDialogProps) {
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!className.trim()) {
      setError("Class name is required.");
      return;
    }
    setError("");
    onCreate(className);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setClassName("");
      setError("");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Create a New Class</DialogTitle>
          <DialogDescription>
            Give your new class a name to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="className">Class Name</Label>
            <Input
              id="className"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g., 'Period 3 English'"
            />
             {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Create Class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

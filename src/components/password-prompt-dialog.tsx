
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
import { Eye, EyeOff, KeyRound } from "lucide-react";

type PasswordPromptDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (password: string) => void;
  contestName: string;
};

export function PasswordPromptDialog({ isOpen, onOpenChange, onSubmit, contestName }: PasswordPromptDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    onSubmit(password);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword("");
      setShowPassword(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-headline text-center">Password Required</DialogTitle>
          <DialogDescription className="text-center">
            The contest "{contestName}" is password protected. Please enter the password to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="contest-password">Password</Label>
                <div className="relative">
                <Input
                    id="contest-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                    >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="w-full">
            <KeyRound className="mr-2 h-4 w-4" />
            Enter Contest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

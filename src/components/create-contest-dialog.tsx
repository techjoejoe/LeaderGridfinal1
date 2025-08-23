
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ContestImageShape } from "@/lib/types";
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type CreateContestDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: (contestName: string, imageShape: ContestImageShape, startDate: Date, endDate: Date) => void;
};

export function CreateContestDialog({ isOpen, onOpenChange, onCreate }: CreateContestDialogProps) {
  const [contestName, setContestName] = useState("");
  const [imageShape, setImageShape] = useState<ContestImageShape>("circular");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [error, setError] = useState("");

  const handleSubmit = () => {
    let hasError = false;
    let newError = "";
    if (!contestName.trim()) {
      newError += "Contest name is required. ";
      hasError = true;
    }
    if (!startDate) {
      newError += "Start date is required. ";
      hasError = true;
    }
    if (!endDate) {
      newError += "End date is required. ";
      hasError = true;
    }
    if (startDate && endDate && startDate > endDate) {
      newError += "End date cannot be before the start date.";
      hasError = true;
    }
    
    setError(newError);
    if (hasError || !startDate || !endDate) return;
    
    onCreate(contestName, imageShape, startDate, endDate);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setContestName("");
      setError("");
      setImageShape("circular");
      setStartDate(new Date());
      setEndDate(undefined);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Create a New Contest</DialogTitle>
          <DialogDescription>
            Give your new photo contest a name and choose the image style.
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
             <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
           <div className="space-y-2">
            <Label>Photo Shape</Label>
            <RadioGroup
              value={imageShape}
              onValueChange={(value: string) => setImageShape(value as ContestImageShape)}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="circular" id="circular" className="peer sr-only" />
                <Label
                  htmlFor="circular"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="w-12 h-12 rounded-full bg-muted-foreground/20 mb-2"></div>
                  Circular
                </Label>
              </div>
              <div>
                <RadioGroupItem value="square" id="square" className="peer sr-only" />
                <Label
                  htmlFor="square"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                   <div className="w-12 h-12 rounded-md bg-muted-foreground/20 mb-2"></div>
                  Square
                </Label>
              </div>
              <div>
                <RadioGroupItem value="original" id="original" className="peer sr-only" />
                <Label
                  htmlFor="original"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                   <div className="w-10 h-12 rounded-md bg-muted-foreground/20 mb-2 transform scale-y-100 origin-bottom flex-shrink-0" style={{backgroundImage: 'linear-gradient(45deg, transparent 40%, hsl(var(--muted-foreground)/0.2) 40%, hsl(var(--muted-foreground)/0.2) 60%, transparent 60%)'}}></div>
                  Original
                </Label>
              </div>
            </RadioGroup>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
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

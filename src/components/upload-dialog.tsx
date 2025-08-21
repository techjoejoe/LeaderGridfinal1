
"use client";

import { useState, useRef } from "react";
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
import { toast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

type UploadDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpload: (name: string, file: File) => void;
};

export function UploadDialog({ isOpen, onOpenChange, onUpload }: UploadDialogProps) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if(selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
            setError("File size cannot exceed 5MB.");
            setFile(null);
        } else if (!['image/jpeg', 'image/png', 'image/gif'].includes(selectedFile.type)) {
            setError("Invalid file type. Please upload a JPG, PNG, or GIF.");
            setFile(null);
        }
        else {
            setFile(selectedFile);
            setError("");
        }
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Image name is required.");
      return;
    }
    if (!file) {
      setError("Please select an image file.");
      return;
    }
    
    setError("");
    onUpload(name, file);
    setName("");
    setFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setName("");
      setFile(null);
      setError("");
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Upload an Image</DialogTitle>
          <DialogDescription>
            Add a new image to the competition. Give it a name and select a file from your computer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 'Majestic Mountains'"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              Image
            </Label>
            <div className="col-span-3">
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/gif"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                {file ? file.name : 'Choose a file'}
              </Button>
            </div>
          </div>
          {error && <p className="col-span-4 text-center text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

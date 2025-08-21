
"use client";

import { useState, useRef, useCallback } from "react";
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
import { Crop, Minus, Plus } from "lucide-react";

type UploadDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpload: (imageName: string, firstName: string, lastName: string, dataUrl: string) => void;
};

const CROP_DIMENSION = 256;

export function UploadDialog({ isOpen, onOpenChange, onUpload }: UploadDialogProps) {
  const [imageName, setImageName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropping state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setError("File size cannot exceed 5MB.");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(selectedFile.type)) {
        setError("Invalid file type. Please upload a JPG, PNG, or GIF.");
        return;
      }
      setFile(selectedFile);
      setError("");
      
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        // Reset crop/zoom when new image is loaded
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      });
      reader.readAsDataURL(selectedFile);
    }
  };

  const getCroppedImg = useCallback(() => {
    if (!imgRef.current || !canvasRef.current || !imageSrc) return null;

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;
    
    // Set canvas to a higher resolution for better quality
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // The effective source size on the original image, adjusted for zoom
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    
    // The source coordinates on the original image, adjusted for panning
    const sourceX = (image.naturalWidth - sourceSize) / 2 + (crop.x * scaleX);
    const sourceY = (image.naturalHeight - sourceSize) / 2 + (crop.y * scaleY);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    // Draw the image
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    return canvas.toDataURL("image/png");
  }, [imageSrc, crop, zoom]);
  
  const handleSubmit = async () => {
    if (!imageName.trim()) {
      setError("Image name is required.");
      return;
    }
     if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!file || !imageSrc) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    
    const croppedDataUrl = getCroppedImg();
    if (croppedDataUrl) {
        onUpload(imageName, firstName, lastName, croppedDataUrl);
        resetState();
    } else {
        setError("Could not process the image. Please try again.");
    }
  };
  
  const resetState = () => {
      setImageName("");
      setFirstName("");
      setLastName("");
      setFile(null);
      setImageSrc(null);
      setError("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  }

  // Mouse event handlers for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setCrop(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(z => Math.max(z - 0.1, 0.2));
  const handleZoomOut = () => setZoom(z => Math.min(z + 0.1, 2));


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Upload an Image</DialogTitle>
          <DialogDescription>
            Add a new image to the competition. Adjust the crop to fit the circle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imageName" className="text-right">Image Name</Label>
                <Input id="imageName" value={imageName} onChange={(e) => setImageName(e.target.value)} className="col-span-3" placeholder="e.g., 'Majestic Mountains'"/>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="col-span-3" placeholder="e.g., 'Jane'"/>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="col-span-3" placeholder="e.g., 'Doe'"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">Image</Label>
                <div className="col-span-3">
                    <Input id="file" type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/png, image/jpeg, image/gif"/>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                        <Crop className="mr-2 h-4 w-4" />
                        {file ? file.name : 'Choose a file'}
                    </Button>
                </div>
            </div>
            {imageSrc && (
                 <div className="flex flex-col items-center gap-4 my-4">
                    <div
                        className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing"
                        style={{ width: CROP_DIMENSION, height: CROP_DIMENSION }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                      >
                       <img 
                          ref={imgRef}
                          src={imageSrc} 
                          alt="Crop preview" 
                          className="pointer-events-none"
                          style={{
                            width: '100%',
                            height: 'auto',
                            transform: `scale(${1/zoom}) translate(${crop.x}px, ${crop.y}px)`,
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                          }}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={handleZoomIn}><Minus className="h-4 w-4"/></Button>
                      <Label>Zoom</Label>
                      <Button variant="outline" size="icon" onClick={handleZoomOut}><Plus className="h-4 w-4"/></Button>
                    </div>
                 </div>
            )}
             <canvas ref={canvasRef} style={{ display: 'none' }} />
             {error && <p className="col-span-4 text-center text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
            <Button onClick={handleSubmit} disabled={!imageSrc} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Upload
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

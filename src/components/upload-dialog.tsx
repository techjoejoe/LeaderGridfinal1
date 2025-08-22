
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  onUpload: (imageName: string, dataUrl: string) => void;
};

const CROP_DIMENSION = 256;
const OUTPUT_DIMENSION = 512;

export function UploadDialog({ isOpen, onOpenChange, onUpload }: UploadDialogProps) {
  const [imageName, setImageName] = useState("");
  const [nameError, setNameError] = useState("");
  const [fileError, setFileError] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simplified state for crop and zoom
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartPointRef = useRef({ x: 0, y: 0 });
  
  // Reset state when dialog opens/closes or new file is selected
  const resetState = useCallback((clearFile = false) => {
    setImageName("");
    setNameError("");
    setFileError("");
    setScale(1);
    setPosition({ x: 0, y: 0 });
    isDraggingRef.current = false;
    dragStartPointRef.current = { x: 0, y: 0 };
    if (clearFile) {
      setImageSrc(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setFileError("File size cannot exceed 5MB.");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        setFileError("Invalid file type. Please upload a JPG, PNG, or GIF.");
        return;
      }
      
      resetState(false); // Reset crop/zoom but not file
      
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
      });
      reader.readAsDataURL(file);
    }
  };
  
  // Calculate boundaries for panning
  const getBoundaries = useCallback(() => {
    if (!imgRef.current) return { x: 0, y: 0 };
    
    const image = imgRef.current;
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    const x_bound = Math.max(0, (scaledWidth - CROP_DIMENSION) / 2);
    const y_bound = Math.max(0, (scaledHeight - CROP_DIMENSION) / 2);
    
    return { x: x_bound, y: y_bound };
  }, [scale]);
  
  // Mouse event handlers for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartPointRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    
    const newX = e.clientX - dragStartPointRef.current.x;
    const newY = e.clientY - dragStartPointRef.current.y;
    
    const boundary = getBoundaries();
    
    setPosition({
      x: Math.max(-boundary.x, Math.min(newX, boundary.x)),
      y: Math.max(-boundary.y, Math.min(newY, boundary.y)),
    });
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = false;
  };
  
  // Zoom handlers
  const handleZoom = (direction: 'in' | 'out') => {
    const newScale = direction === 'in' ? scale * 1.1 : scale / 1.1;
    const minScale = imgRef.current ? Math.min(CROP_DIMENSION / imgRef.current.width, CROP_DIMENSION / imgRef.current.height, 1) : 1;
    setScale(Math.max(minScale, Math.min(newScale, 3))); // Clamp zoom 
  };

  // Adjust position if zoom change pushes image out of bounds
  useEffect(() => {
    const boundary = getBoundaries();
    setPosition(currentPos => ({
        x: Math.max(-boundary.x, Math.min(currentPos.x, boundary.x)),
        y: Math.max(-boundary.y, Math.min(currentPos.y, boundary.y)),
    }));
  }, [scale, getBoundaries]);

  // Generate the final cropped image
  const getCroppedImg = useCallback(() => {
    if (!imgRef.current || !canvasRef.current) return null;

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    
    canvas.width = OUTPUT_DIMENSION;
    canvas.height = OUTPUT_DIMENSION;

    const sourceImageWidth = image.naturalWidth;
    const sourceImageHeight = image.naturalHeight;

    // The scale of the on-screen image relative to the crop UI dimension
    const displayScale = Math.max(CROP_DIMENSION / sourceImageWidth, CROP_DIMENSION / sourceImageHeight);
    
    // The size of the crop area on the source image
    const cropSizeOnSource = CROP_DIMENSION / (displayScale * scale);

    // Calculate the top-left corner (sx, sy) of the crop area on the source image
    const sx = (sourceImageWidth / 2) - (cropSizeOnSource / 2) - (position.x / (displayScale * scale));
    const sy = (sourceImageHeight / 2) - (cropSizeOnSource / 2) - (position.y / (displayScale * scale));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a circular clipping path
    ctx.beginPath();
    ctx.arc(OUTPUT_DIMENSION / 2, OUTPUT_DIMENSION / 2, OUTPUT_DIMENSION / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    
    // Draw the image
    ctx.drawImage(
      image,
      sx,
      sy,
      cropSizeOnSource,
      cropSizeOnSource,
      0,
      0,
      OUTPUT_DIMENSION,
      OUTPUT_DIMENSION
    );

    return canvas.toDataURL("image/png");
  }, [position, scale]);
  
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const initialScale = Math.max(CROP_DIMENSION / img.naturalWidth, CROP_DIMENSION / img.naturalHeight);
    setScale(initialScale);
    setPosition({ x: 0, y: 0 });
  };


  const handleSubmit = () => {
    let hasError = false;
    if (!imageName.trim()) {
      setNameError("Image name is required.");
      hasError = true;
    } else {
        setNameError("");
    }

    if (!imageSrc) {
      setFileError("Please select an image file.");
      hasError = true;
    } else {
        setFileError("");
    }

    if (hasError) {
        return;
    }
    
    const croppedDataUrl = getCroppedImg();
    if (croppedDataUrl) {
        onUpload(imageName, croppedDataUrl);
        resetState(true);
    } else {
        setFileError("Could not process the image. Please try again.");
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetState(true); // Reset everything when dialog is closed
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Enter the Contest</DialogTitle>
          <DialogDescription>
            Upload your badge design. Pan and zoom to fit the image in the circle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="imageName">Badge Name</Label>
                <Input id="imageName" value={imageName} onChange={(e) => setImageName(e.target.value)} placeholder="e.g., 'Team Matty Innovator'"/>
                {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="file">Image</Label>
                <Input id="file" type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/png, image/jpeg, image/gif"/>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                    <Crop className="mr-2 h-4 w-4" />
                    {fileInputRef.current?.files?.[0]?.name || 'Choose a file'}
                </Button>
                 {fileError && <p className="text-sm text-destructive">{fileError}</p>}
            </div>
            
            {imageSrc && (
                 <div className="flex flex-col items-center gap-4 pt-4">
                    <div
                        className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center bg-muted"
                        style={{ width: CROP_DIMENSION, height: CROP_DIMENSION }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUpOrLeave}
                        onMouseLeave={handleMouseUpOrLeave}
                      >
                       <img 
                          ref={imgRef}
                          src={imageSrc} 
                          alt="Crop preview" 
                          className="pointer-events-none"
                          style={{
                            width: 'auto',
                            height: 'auto',
                            maxWidth: 'none',
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                          }}
                          crossOrigin="anonymous"
                          onLoad={handleImageLoad}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleZoom('out')}><Minus className="h-4 w-4"/></Button>
                      <Label>Zoom</Label>
                      <Button variant="outline" size="icon" onClick={() => handleZoom('in')}><Plus className="h-4 w-4"/></Button>
                    </div>
                 </div>
            )}
             <canvas ref={canvasRef} style={{ display: 'none' }} />
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

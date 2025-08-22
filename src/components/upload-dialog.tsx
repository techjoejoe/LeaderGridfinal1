
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

export function UploadDialog({ isOpen, onOpenChange, onUpload }: UploadDialogProps) {
  const [imageName, setImageName] = useState("");
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
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });


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

  useEffect(() => {
    const image = imgRef.current;
    if (imageSrc && image) {
      const onImageLoad = () => {
        const { naturalWidth, naturalHeight } = image;
        const scale = Math.max(CROP_DIMENSION / naturalWidth, CROP_DIMENSION / naturalHeight);
        const initialWidth = naturalWidth * scale;
        const initialHeight = naturalHeight * scale;
        setImageDimensions({ width: initialWidth, height: initialHeight });
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };

      if (image.complete) {
        onImageLoad();
      } else {
        image.onload = onImageLoad;
      }
    }
  }, [imageSrc]);

  const imageStyle: React.CSSProperties = {
    width: `${imageDimensions.width}px`,
    height: `${imageDimensions.height}px`,
    transform: `translate(${crop.x}px, ${crop.y}px) scale(${zoom})`,
    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
    maxWidth: 'none',
  }

  const getCroppedImg = useCallback(() => {
    if (!imgRef.current || !canvasRef.current || !imageSrc) return null;

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // The scale of the display image relative to the crop area
    const displayScale = imageDimensions.width / CROP_DIMENSION;
    
    // Total scale including user zoom
    const totalScale = zoom / displayScale;

    // The dimensions of the source image to draw
    const sourceWidth = image.naturalWidth / totalScale;
    const sourceHeight = image.naturalHeight / totalScale;

    // The top-left corner of the source image to draw
    const sourceX = (image.naturalWidth - sourceWidth) / 2 - (crop.x * (image.naturalWidth / imageDimensions.width));
    const sourceY = (image.naturalHeight - sourceHeight) / 2 - (crop.y * (image.naturalHeight / imageDimensions.height));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputSize,
      outputSize
    );

    return canvas.toDataURL("image/png");
  }, [imageSrc, crop, zoom, imageDimensions]);
  
  const handleSubmit = async () => {
    if (!imageName.trim()) {
      setError("Image name is required.");
      return;
    }
    if (!file || !imageSrc) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    
    const croppedDataUrl = getCroppedImg();
    if (croppedDataUrl) {
        onUpload(imageName, croppedDataUrl);
        resetState(true);
    } else {
        setError("Could not process the image. Please try again.");
    }
  };
  
  const resetState = (uploadSucceeded = false) => {
      setImageName("");
      setError("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      if (uploadSucceeded) {
        setFile(null);
        setImageSrc(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState(true);
    }
    onOpenChange(open);
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      const scaledWidth = imageDimensions.width * zoom;
      const scaledHeight = imageDimensions.height * zoom;

      const x_bound = (scaledWidth - CROP_DIMENSION) / 2;
      const y_bound = (scaledHeight - CROP_DIMENSION) / 2;
      
      setCrop({
          x: Math.max(-x_bound, Math.min(dx, x_bound)),
          y: Math.max(-y_bound, Math.min(dy, y_bound)),
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 1));
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 3));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Enter the Contest</DialogTitle>
          <DialogDescription>
            Upload your best picture to join the competition. Adjust the crop to fit the circle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imageName" className="text-right">Image Name</Label>
                <Input id="imageName" value={imageName} onChange={(e) => setImageName(e.target.value)} className="col-span-3" placeholder="e.g., 'Majestic Mountains'"/>
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
                        className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center bg-muted"
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
                          style={imageStyle}
                          crossOrigin="anonymous"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoom <= 1}><Minus className="h-4 w-4"/></Button>
                      <Label>Zoom</Label>
                      <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoom >= 3}><Plus className="h-4 w-4"/></Button>
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

    
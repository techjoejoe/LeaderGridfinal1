
"use client";

import React, { useState, useCallback } from "react";
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

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
import { Slider } from "@/components/ui/slider";
import { Crop, Upload } from "lucide-react";
import { getCroppedImg } from "@/lib/image-utils";

type UploadDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpload: (photoName: string, uploaderName: string, dataUrl: string) => void;
};

export function UploadDialog({ isOpen, onOpenChange, onUpload }: UploadDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  const [nameError, setNameError] = useState("");
  const [fileError, setFileError] = useState("");
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setImageSrc(null);
    setPhotoName("");
    setUploaderName("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setNameError("");
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileError("");
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setFileError("File size cannot exceed 10MB.");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setFileError("Invalid file type. Please upload a JPG, PNG, GIF or WebP.");
        return;
      }
      
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  const handleSubmit = async () => {
    let hasError = false;
    if (!photoName.trim()) {
      setNameError("Photo name is required.");
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

    if (hasError || !croppedAreaPixels) {
      return;
    }

    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      if (!croppedImageBlob) {
        setFileError("Could not process the image. Please try again.");
        return;
      }
      
      const compressedBlob = await imageCompression(croppedImageBlob, {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
        useWebWorker: true,
        fileType: 'image/webp',
      });

      const reader = new FileReader();
      reader.readAsDataURL(compressedBlob);
      reader.onloadend = () => {
        const base64data = reader.result;
        onUpload(photoName, uploaderName, base64data as string);
        onOpenChange(false);
      };
      
    } catch (e) {
      console.error(e);
      setFileError("An error occurred while cropping the image.");
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Upload a Photo</DialogTitle>
          <DialogDescription>
            Upload your photo. Pan and zoom to fit the image in the circle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="photoName">Photo Name</Label>
                <Input id="photoName" value={photoName} onChange={(e) => setPhotoName(e.target.value)} placeholder="e.g., 'Sunset over the lake'"/>
                {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="uploaderName">Your Name (Optional)</Label>
                <Input id="uploaderName" value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} placeholder="e.g., 'Jane Doe'"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="file">Image</Label>
                <Input id="file" type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/png, image/jpeg, image/gif, image/webp"/>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                    <Crop className="mr-2 h-4 w-4" />
                    {fileInputRef.current?.files?.[0]?.name || 'Choose a file'}
                </Button>
                 {fileError && <p className="text-sm text-destructive">{fileError}</p>}
            </div>
            
            {imageSrc && (
                 <div className="relative h-64 w-full bg-muted rounded-md">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      cropShape="round"
                      showGrid={false}
                    />
                 </div>
            )}
            {imageSrc && (
                <div className="space-y-2">
                    <Label htmlFor="zoom">Zoom</Label>
                    <Slider
                      id="zoom"
                      min={1}
                      max={3}
                      step={0.1}
                      value={[zoom]}
                      onValueChange={(val) => setZoom(val[0])}
                    />
                </div>
            )}
        </div>
        <DialogFooter>
            <Button onClick={handleSubmit} disabled={!imageSrc} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string), false)
    reader.readAsDataURL(file)
  })
}

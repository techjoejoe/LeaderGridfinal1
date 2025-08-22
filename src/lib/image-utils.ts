
export function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.setAttribute('crossOrigin', 'anonymous')
      image.src = url
    })
  }
  
  export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number }
  ): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
  
    if (!ctx) {
      return null;
    }
  
    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
  
    // set each dimensions to double largest dimension to allow for a safe area for the
    // image to rotate in without being clipped by canvas context
    canvas.width = safeArea;
    canvas.height = safeArea;
  
    // translate canvas context to a central location on image to allow rotating around the center.
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.translate(-image.width / 2, -image.height / 2);
  
    // draw rotated image and store data.
    ctx.drawImage(
      image,
      0,
      0
    );
    const data = ctx.getImageData(0, 0, safeArea, safeArea);
  
    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
  
    // paste generated rotate image with correct offsets for x,y crop values.
    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
    );
  
    // As Base64 string
    // return canvas.toDataURL('image/jpeg');
  
    // As a blob
    return new Promise((resolve) => {
      canvas.toBlob((file) => {
        if(file) resolve(file);
      }, 'image/webp');
    });
}

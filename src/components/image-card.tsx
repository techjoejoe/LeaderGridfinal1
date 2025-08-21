
"use client";

import type { PicVoteImage } from "@/lib/types";

type ImageCardProps = {
  image: PicVoteImage;
  onVote: (id: string) => void;
  disabled: boolean;
};

export function ImageCard({ image, onVote, disabled }: ImageCardProps) {
  return (
    <div style={{border:'1px solid #eee', padding:12, borderRadius:12}}>
      <img
        src={image.url}
        alt={image.name ?? 'photo'}
        style={{ width:'100%', height:'auto', display:'block' }}
      />
      <button onClick={()=>onVote(image.id)} disabled={disabled}>Vote</button>
    </div>
  );
}

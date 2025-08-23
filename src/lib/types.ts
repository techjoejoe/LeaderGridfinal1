
import type { Timestamp } from "firebase/firestore";

export type PicVoteImage = {
  id: string;
  name: string;
  url: string;
  votes: number;
  firstName: string;
  lastName: string;
  uploaderUid: string;
  contestId: string;
};

export type UserVoteData = {
  votesToday: number;
  lastVotedWeekday: number; // 0 (Sun) to 6 (Sat)
  lastVotedDate: string; // YYYY-MM-DD
  imageVotes: { [imageId: string]: number };
};

export type Contest = {
    id: string;
    name: string;
    creatorUid: string;
    creatorName: string;
    status: 'active' | 'finished';
    createdAt: Timestamp;
}

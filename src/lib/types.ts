
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
  contestId: string; // To be used in collectionGroup queries
  votesToday: number;
  lastVotedDate: string; // YYYY-MM-DD
  imageVotes: { [imageId: string]: number };
};

export type ContestImageShape = 'circular' | 'square' | 'original';

export type Contest = {
    id: string;
    name: string;
    creatorUid: string;
    creatorName: string;
    status: 'active' | 'finished';
    createdAt: Timestamp;
    startDate: Timestamp;
    endDate: Timestamp;
    imageShape: ContestImageShape;
    hasPassword?: boolean;
    password?: string;
    classId?: string; // Link to the Class
}

// Represents a user's document in the 'users' collection
export type UserData = {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: 'trainer' | 'student';
    classIds: string[]; // List of classes the user is a member of
};

// Represents a Class document in the 'classes' collection
export type Class = {
    id: string;
    name: string;
    trainerUid: string;
    trainerName?: string; // Denormalized for easy display
    learnerUids: string[];
    createdAt: Timestamp;
    inviteCode: string;
};

// Live Polling Types
export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id:string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  createdAt: number; // timestamp
}

export interface PollSession {
  id: string; // same as classId
  code: string; // User-friendly code to join
  adminUid: string; // trainer's uid
  polls: { [pollId: string]: Poll };
  activePollId?: string | null;
  isAcceptingVotes: boolean;
  createdAt: number; // timestamp
}

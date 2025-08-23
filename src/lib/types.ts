
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
    role: 'trainer' | 'learner';
    classIds: string[]; // List of classes the user is a member of
};

// Represents a Class document in the 'classes' collection
export type Class = {
    id: string;
    name: string;
    trainerUid: string;
    learnerUids: string[];
    createdAt: Timestamp;
    inviteCode: string;
};

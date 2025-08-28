
import type { Timestamp } from "firebase/firestore";

export type PicVoteImage = {
  id: string;
  name: string;
  url: string;
  storagePath: string; // Add this
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
    role: 'trainer' | 'student' | 'manager';
    classIds?: string[]; // List of classes the user is a member of (for students)
    managedTrainerUids?: string[]; // List of trainer UIDs this manager oversees
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

// Represents a Note on a student
export type StudentNote = {
    id: string;
    studentUid: string;
    trainerUid:string;
    trainerName: string;
    classId: string;
    note: string;
    createdAt: Timestamp;
}

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

// Quiz Battle Types
export interface QuizQuestion {
  id: number;
  question: string;
  correctAnswer: string;
  answers: string[];
  imageUrl?: string | null;
}

export interface QuizPlayer {
  id: string;
  name: string;
  score: number;
  lastPoints?: number;
  answerTime?: number;
}

export interface QuizSettings {
  timeLimit: number;
  basePoints: number;
  autoAdvance: boolean;
  showLeaderboard: boolean;
}

export interface QuizSession {
  id: string; // same as classId
  roomCode: string;
  hostUid: string;
  classId: string;
  settings: QuizSettings;
  questions: QuizQuestion[];
  currentQuestion: number;
  gameState: 'waiting' | 'active' | 'results' | 'ended';
  players: { [playerId: string]: QuizPlayer };
  answers: { [playerId: string]: string }; // For the current question
  createdAt: number;
}

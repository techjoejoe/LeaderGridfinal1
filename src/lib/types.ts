
export type PicVoteImage = {
  id: string;
  name: string;
  url: string;
  votes: number;
  firstName: string;
  lastName: string;
  uploaderUid: string;
};

export type DailyVoteInfo = {
  votesLeft: number;
  votedImageIds: string[];
};

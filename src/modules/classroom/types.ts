import type { Stroke } from "./input";
export type ClassroomSnapshot = {
  room: {
    id: string;
    title: string;
    state: "scheduled" | "open" | "ended";
    locked: boolean;
  };
  me: {
    userId: string;
    name: string;
    manager: boolean;
    canDraw: boolean;
    canSpeak: boolean;
  };
  brand: {
    displayName: string;
    tone: "emerald" | "ocean" | "violet";
    welcome: string;
  };
  board: { revision: number; strokes: Stroke[] };
  messages: {
    id: string;
    name: string;
    body: string;
    mine: boolean;
    hidden: boolean;
    createdAt: string;
  }[];
  people: {
    membershipId: string;
    userId: string;
    name: string;
    role: string;
    present: boolean;
    raisedHand: boolean;
    admitted: boolean;
    banned: boolean;
    canSpeak: boolean;
    protected: boolean;
  }[];
};

export interface SaveJson {
  dwellers: {
    dwellers: Dweller[];
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface Dweller {
  serializeId: number;
  name: string;
  lastName: string;
  gender: number;
  experience?: { currentLevel?: number };
  [k: string]: unknown;
}

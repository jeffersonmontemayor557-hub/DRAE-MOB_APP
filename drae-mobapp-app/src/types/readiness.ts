export type ReadinessState = {
  checkedIds: string[];
  score: number;
};

export const emptyReadinessState: ReadinessState = {
  checkedIds: [],
  score: 0,
};

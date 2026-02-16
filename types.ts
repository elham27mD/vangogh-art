
export type QuestionType = 'selection' | 'scale' | 'slider';

export interface Question {
  id: number;
  text: string;
  image: string;
  type: QuestionType;
  answers?: { id: AnswerValue; label: string }[];
}

export type AnswerValue = 'always' | 'sometimes' | 'rarely' | number;

export interface UserResponse {
  questionId: number;
  answer: AnswerValue;
}

export enum AppState {
  INTRO = 'INTRO',
  QUIZ = 'QUIZ',
  RESULT = 'RESULT'
}

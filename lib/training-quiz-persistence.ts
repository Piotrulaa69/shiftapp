import type { DbTopicQuiz } from './supabase';

/** JSONB may reorder object keys. Compare the fields that make up a quiz instead. */
export function sameTrainingQuiz(left: DbTopicQuiz | null, right: DbTopicQuiz | null): boolean {
  if (!left || !right) return left === right;
  const content = (quiz: DbTopicQuiz) => ({
    pass_score: quiz.pass_score,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      question: question.question,
      type: question.type ?? 'single_choice',
      answers: question.answers.map((answer) => ({ id: answer.id, text: answer.text, correct: answer.correct })),
      accepted_answers: question.accepted_answers ?? [],
    })),
  });
  return JSON.stringify(content(left)) === JSON.stringify(content(right));
}

export type QuizSaveResult =
  | { saved: true; updatedAt: string }
  | { saved: false; reason: 'conflict' | 'unverified' };

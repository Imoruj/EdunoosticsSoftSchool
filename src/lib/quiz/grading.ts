import type {
    Quiz,
    QuizAttempt,
    QuizResponse,
    QuizQuestion,
    MCQData,
    FillBlankData,
    DragDropData,
    TrueFalseData
} from '../db/types';

/**
 * Normalizes text for comparison by lowercasing and trimming whitespace
 */
function normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Grades a single question
 */
export function gradeQuestion(question: QuizQuestion, answer: any): { isCorrect: boolean; pointsEarned: number } {
    if (answer === undefined || answer === null || answer === '') {
        return { isCorrect: false, pointsEarned: 0 };
    }

    try {
        switch (question.type) {
            case 'multiple_choice': {
                const data = question.data as MCQData;
                const correctOptionIds = data.options.filter(o => o.isCorrect).map(o => o.id);

                if (data.multipleCorrect) {
                    const selectedOptionIds = Array.isArray(answer) ? answer : [answer];
                    // Check if selected options match correct options exactly (regardless of order)
                    const isCorrect =
                        selectedOptionIds.length === correctOptionIds.length &&
                        selectedOptionIds.every(id => correctOptionIds.includes(id));
                    return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
                } else {
                    const isCorrect = correctOptionIds.includes(answer as string);
                    return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
                }
            }

            case 'true_false': {
                const data = question.data as TrueFalseData;
                const isCorrect = data.correctAnswer === (answer === true || answer === 'true');
                return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
            }

            case 'fill_blank': {
                const data = question.data as FillBlankData;
                const answers = answer as Record<string, string>; // blank ID -> typed value

                let correctCount = 0;
                const totalBlanks = data.blanks.length;

                for (const blank of data.blanks) {
                    const studentAnswer = answers[blank.id] || '';

                    const isMatch = blank.correctAnswers.some(correct => {
                        if (blank.caseSensitive) {
                            return correct.trim() === studentAnswer.trim();
                        }
                        return normalizeText(correct) === normalizeText(studentAnswer);
                    });

                    if (isMatch) correctCount++;
                }

                // Partial credit possible, but for simplicity we'll do proportional or all-or-nothing
                // Let's do proportional points
                const pointsEarned = totalBlanks > 0 ? (correctCount / totalBlanks) * question.points : 0;
                const isCorrect = correctCount === totalBlanks;

                return { isCorrect, pointsEarned };
            }

            case 'drag_drop': {
                const data = question.data as DragDropData;
                const matches = answer as Record<string, string>; // itemId -> zoneId

                let correctCount = 0;
                const totalItems = data.items.length;

                for (const item of data.items) {
                    const correctMatch = data.matches.find(m => m.itemId === item.id);
                    const studentZoneId = matches[item.id];

                    if (correctMatch && studentZoneId === correctMatch.zoneId) {
                        correctCount++;
                    }
                }

                const pointsEarned = totalItems > 0 ? (correctCount / totalItems) * question.points : 0;
                const isCorrect = correctCount === totalItems;

                return { isCorrect, pointsEarned };
            }

            case 'short_answer':
            case 'long_answer':
                // These require manual grading. They are marked as incorrect for auto-grading purposes initially.
                // Or marked as pending if we track that state. For now, 0 points.
                return { isCorrect: false, pointsEarned: 0 };

            default:
                return { isCorrect: false, pointsEarned: 0 };
        }
    } catch (err) {
        console.error(`Error grading question ${question.id}:`, err);
        return { isCorrect: false, pointsEarned: 0 };
    }
}

/**
 * Grades an entire quiz submission
 */
export function gradeQuiz(
    quiz: Quiz,
    studentId: string,
    answers: QuizResponse[],
    startedAt: number
): QuizAttempt {

    let totalPoints = 0;
    let earnedPoints = 0;

    const responses = answers.map(answer => {
        const question = quiz.questions.find(q => q.id === answer.questionId);

        if (!question) {
            return { ...answer, isCorrect: false, pointsEarned: 0 };
        }

        totalPoints += question.points;

        const { isCorrect, pointsEarned } = gradeQuestion(question, answer.answer);
        earnedPoints += pointsEarned;

        return {
            ...answer,
            isCorrect,
            pointsEarned
        };
    });

    // Calculate missing questions
    const answeredQuestionIds = new Set(answers.map(a => a.questionId));
    const missingQuestions = quiz.questions.filter(q => !answeredQuestionIds.has(q.id));

    for (const missing of missingQuestions) {
        totalPoints += missing.points;
        responses.push({
            questionId: missing.id,
            answer: null,
            isCorrect: false,
            pointsEarned: 0
        });
    }

    // Calculate score percentage
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const isPassed = score >= quiz.settings.passingScore;

    return {
        id: `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        quizId: quiz.id,
        studentId,
        startedAt: startedAt || Date.now(),
        completedAt: Date.now(),
        responses,
        score,
        totalPoints,
        earnedPoints,
        isPassed,
    };
}

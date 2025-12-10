
export interface Solution {
    steps: string;
    svg: string | null;
}

export interface ProblemSolutionResponse {
    problemText: string;
    problemCount: number;
    solution: Solution;
}

export interface GeneratedProblems {
    problems: string[];
}
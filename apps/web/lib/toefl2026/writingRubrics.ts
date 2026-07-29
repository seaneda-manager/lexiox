/**
 * ETS TOEFL Writing Rubrics (2026)
 * Task 2 (Email) & Task 3 (Academic Discussion)
 */

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
  keyPoints: string[];
}

export interface RubricCategory {
  name: string;
  category: "Task Completion" | "Development" | "Language Use";
  levels: RubricLevel[];
}

/**
 * Task 2 (Write an Email) Rubric
 * 5.0 = Excellent | 4.0 = Good | 3.0 = Fair | 2.0 = Limited | 1.0 = Incomplete | 0.0 = No attempt
 */
export const TASK2_EMAIL_RUBRIC: RubricCategory[] = [
  {
    name: "Task Completion",
    category: "Task Completion",
    levels: [
      {
        score: 5.0,
        label: "Excellent (5.0)",
        description:
          "The email fully addresses all required elements with a clear purpose and appropriate tone.",
        keyPoints: [
          "Addresses all required information",
          "Clear opening and closing",
          "Appropriate email conventions",
          "Professional/casual tone as required",
        ],
      },
      {
        score: 4.0,
        label: "Good (4.0)",
        description:
          "The email addresses most required elements with a generally clear purpose and mostly appropriate tone.",
        keyPoints: [
          "Addresses most required information",
          "Mostly clear structure",
          "Generally appropriate tone",
          "Minor tone inconsistencies",
        ],
      },
      {
        score: 3.0,
        label: "Fair (3.0)",
        description:
          "The email addresses some required elements but may lack clarity or appropriate tone in places.",
        keyPoints: [
          "Addresses some required information",
          "Unclear in places",
          "Inconsistent tone",
          "Some missing details",
        ],
      },
      {
        score: 2.0,
        label: "Limited (2.0)",
        description:
          "The email addresses very few required elements and lacks clarity or appropriate tone.",
        keyPoints: [
          "Addresses minimal information",
          "Unclear purpose",
          "Inappropriate tone",
          "Many missing details",
        ],
      },
      {
        score: 1.0,
        label: "Incomplete (1.0)",
        description:
          "The email barely addresses the task with little to no coherence.",
        keyPoints: [
          "Minimal information",
          "No clear purpose",
          "No appropriate structure",
        ],
      },
      {
        score: 0.0,
        label: "No Attempt (0.0)",
        description: "No response or completely off-topic.",
        keyPoints: ["No response", "Off-topic", "Unintelligible"],
      },
    ],
  },
  {
    name: "Development",
    category: "Development",
    levels: [
      {
        score: 5.0,
        label: "Excellent (5.0)",
        description:
          "Ideas are well-developed with relevant details and clear connections.",
        keyPoints: [
          "Supporting details are relevant and specific",
          "Logical progression of ideas",
          "Well-connected sentences",
          "Complete thoughts",
        ],
      },
      {
        score: 4.0,
        label: "Good (4.0)",
        description:
          "Ideas are generally developed with mostly relevant details and clear connections.",
        keyPoints: [
          "Most details are relevant",
          "Generally logical progression",
          "Mostly connected ideas",
          "Some complete thoughts",
        ],
      },
      {
        score: 3.0,
        label: "Fair (3.0)",
        description:
          "Ideas are somewhat developed but may lack relevant details or clear connections.",
        keyPoints: [
          "Some relevant details",
          "Somewhat logical organization",
          "Some unclear connections",
          "Some incomplete thoughts",
        ],
      },
      {
        score: 2.0,
        label: "Limited (2.0)",
        description:
          "Ideas are poorly developed with few relevant details and unclear connections.",
        keyPoints: [
          "Few supporting details",
          "Unclear organization",
          "Weak connections",
          "Many incomplete thoughts",
        ],
      },
      {
        score: 1.0,
        label: "Incomplete (1.0)",
        description: "Ideas lack development with minimal or no details.",
        keyPoints: [
          "Minimal details",
          "Disorganized",
          "No clear connections",
        ],
      },
      {
        score: 0.0,
        label: "No Attempt (0.0)",
        description: "No response or development.",
        keyPoints: ["No response"],
      },
    ],
  },
  {
    name: "Language Use",
    category: "Language Use",
    levels: [
      {
        score: 5.0,
        label: "Excellent (5.0)",
        description:
          "Grammar, word choice, and sentence structure are accurate with varied vocabulary.",
        keyPoints: [
          "Few or no grammatical errors",
          "Precise word choice",
          "Varied sentence structure",
          "Appropriate register",
        ],
      },
      {
        score: 4.0,
        label: "Good (4.0)",
        description:
          "Grammar, word choice, and sentence structure are mostly accurate with adequate vocabulary.",
        keyPoints: [
          "Minor grammatical errors",
          "Generally good word choice",
          "Some varied sentence structure",
          "Mostly appropriate register",
        ],
      },
      {
        score: 3.0,
        label: "Fair (3.0)",
        description:
          "Grammar, word choice, and sentence structure have some errors; vocabulary is adequate.",
        keyPoints: [
          "Some grammatical errors",
          "Adequate word choice",
          "Limited sentence variety",
          "Inconsistent register",
        ],
      },
      {
        score: 2.0,
        label: "Limited (2.0)",
        description:
          "Grammar, word choice, and sentence structure have frequent errors; vocabulary is basic.",
        keyPoints: [
          "Frequent grammatical errors",
          "Basic word choice",
          "Simple sentences",
          "Inappropriate register",
        ],
      },
      {
        score: 1.0,
        label: "Incomplete (1.0)",
        description:
          "Numerous errors in grammar, word choice, and structure that impede comprehension.",
        keyPoints: [
          "Many errors",
          "Poor word choice",
          "Difficult to understand",
        ],
      },
      {
        score: 0.0,
        label: "No Attempt (0.0)",
        description: "No response.",
        keyPoints: ["No response"],
      },
    ],
  },
];

/**
 * Task 3 (Academic Discussion) Rubric
 * Similar structure but slightly different criteria
 */
export const TASK3_DISCUSSION_RUBRIC: RubricCategory[] = [
  {
    name: "Task Completion",
    category: "Task Completion",
    levels: [
      {
        score: 5.0,
        label: "Excellent (5.0)",
        description:
          "Response fully addresses the prompt with a clear position and relevant discussion of multiple perspectives.",
        keyPoints: [
          "Clear position on the topic",
          "Addresses opposing viewpoints",
          "Relevant examples or reasoning",
          "Engages with the academic discussion",
        ],
      },
      {
        score: 4.0,
        label: "Good (4.0)",
        description:
          "Response addresses most of the prompt with a generally clear position and discussion of perspectives.",
        keyPoints: [
          "Clear position",
          "Some opposing viewpoints",
          "Mostly relevant examples",
          "Generally engages with discussion",
        ],
      },
      {
        score: 3.0,
        label: "Fair (3.0)",
        description:
          "Response addresses some aspects of the prompt but may lack clarity in position or discussion.",
        keyPoints: [
          "Somewhat clear position",
          "Limited perspective discussion",
          "Some examples",
          "Partial engagement",
        ],
      },
      {
        score: 2.0,
        label: "Limited (2.0)",
        description:
          "Response addresses the prompt minimally with unclear position and limited discussion.",
        keyPoints: [
          "Unclear position",
          "Minimal perspectives",
          "Few examples",
          "Weak engagement",
        ],
      },
      {
        score: 1.0,
        label: "Incomplete (1.0)",
        description: "Response barely addresses the prompt.",
        keyPoints: [
          "No clear position",
          "Minimal content",
          "Off-topic",
        ],
      },
      {
        score: 0.0,
        label: "No Attempt (0.0)",
        description: "No response or completely off-topic.",
        keyPoints: ["No response"],
      },
    ],
  },
  {
    name: "Development",
    category: "Development",
    levels: [
      {
        score: 5.0,
        label: "Excellent (5.0)",
        description:
          "Ideas are well-developed with specific examples, reasoning, and clear explanations.",
        keyPoints: [
          "Specific, relevant examples",
          "Clear reasoning and logic",
          "Well-explained concepts",
          "Strong support for position",
        ],
      },
      {
        score: 4.0,
        label: "Good (4.0)",
        description:
          "Ideas are generally developed with adequate examples and reasoning.",
        keyPoints: [
          "Adequate examples",
          "Generally sound reasoning",
          "Mostly clear explanations",
          "Good support",
        ],
      },
      {
        score: 3.0,
        label: "Fair (3.0)",
        description:
          "Ideas are somewhat developed but may lack specific examples or clear reasoning.",
        keyPoints: [
          "Some examples",
          "Adequate but basic reasoning",
          "Unclear in places",
          "Partial support",
        ],
      },
      {
        score: 2.0,
        label: "Limited (2.0)",
        description:
          "Ideas are poorly developed with few examples or weak reasoning.",
        keyPoints: [
          "Few examples",
          "Weak reasoning",
          "Unclear development",
          "Minimal support",
        ],
      },
      {
        score: 1.0,
        label: "Incomplete (1.0)",
        description: "Ideas lack development and support.",
        keyPoints: [
          "No examples",
          "No reasoning",
          "Minimal content",
        ],
      },
      {
        score: 0.0,
        label: "No Attempt (0.0)",
        description: "No response.",
        keyPoints: ["No response"],
      },
    ],
  },
  {
    name: "Language Use",
    category: "Language Use",
    levels: [
      {
        score: 5.0,
        label: "Excellent (5.0)",
        description:
          "Grammar, syntax, and vocabulary are accurate and appropriate for academic writing.",
        keyPoints: [
          "Few grammatical errors",
          "Sophisticated vocabulary",
          "Varied, complex sentences",
          "Appropriate academic tone",
        ],
      },
      {
        score: 4.0,
        label: "Good (4.0)",
        description:
          "Grammar, syntax, and vocabulary are mostly accurate with appropriate academic language.",
        keyPoints: [
          "Minor grammatical errors",
          "Good vocabulary",
          "Some complex sentences",
          "Generally academic tone",
        ],
      },
      {
        score: 3.0,
        label: "Fair (3.0)",
        description:
          "Grammar, syntax, and vocabulary are adequate but have some errors.",
        keyPoints: [
          "Some grammatical errors",
          "Adequate vocabulary",
          "Mostly simple sentences",
          "Inconsistent tone",
        ],
      },
      {
        score: 2.0,
        label: "Limited (2.0)",
        description:
          "Grammar, syntax, and vocabulary have frequent errors that sometimes impede understanding.",
        keyPoints: [
          "Frequent errors",
          "Basic vocabulary",
          "Simple or awkward sentences",
          "Poor tone",
        ],
      },
      {
        score: 1.0,
        label: "Incomplete (1.0)",
        description:
          "Many grammatical and vocabulary errors that significantly impede understanding.",
        keyPoints: [
          "Many errors",
          "Poor vocabulary",
          "Difficult to understand",
        ],
      },
      {
        score: 0.0,
        label: "No Attempt (0.0)",
        description: "No response.",
        keyPoints: ["No response"],
      },
    ],
  },
];

/**
 * Rubric 기준에 맞는 피드백 템플릿
 */
export interface RubricFeedbackTemplate {
  score: number;
  taskCompletion: string;
  development: string;
  languageUse: string;
  suggestions: string[];
}

export const TASK2_FEEDBACK_TEMPLATES: RubricFeedbackTemplate[] = [
  {
    score: 5.0,
    taskCompletion: "Excellent job addressing all email requirements with a clear purpose.",
    development: "Your ideas are well-developed with relevant and specific details.",
    languageUse: "Grammar and vocabulary are excellent with varied sentence structures.",
    suggestions: ["This is an excellent response.", "Keep up this level of writing."],
  },
  {
    score: 4.0,
    taskCompletion: "Good job addressing most email requirements with a generally clear purpose.",
    development: "Your ideas are generally developed with mostly relevant details.",
    languageUse: "Grammar and vocabulary are mostly accurate with minor errors.",
    suggestions: [
      "Add more specific details in one or two places.",
      "Consider varying your sentence structures more.",
    ],
  },
  {
    score: 3.0,
    taskCompletion: "You addressed some email requirements but clarity could be improved.",
    development: "Your ideas are somewhat developed, but more support would strengthen them.",
    languageUse: "Some grammatical and vocabulary errors that occasionally affect clarity.",
    suggestions: [
      "Expand on your main ideas with more details.",
      "Review grammar in a few sentences.",
      "Use more precise vocabulary in some places.",
    ],
  },
  {
    score: 2.0,
    taskCompletion: "You addressed very few email requirements; purpose is unclear.",
    development: "Your ideas need more development with specific examples and details.",
    languageUse: "Multiple grammatical and vocabulary errors that often affect clarity.",
    suggestions: [
      "Review the email format and requirements.",
      "Add specific details to support your ideas.",
      "Focus on basic grammar and word choice.",
    ],
  },
  {
    score: 1.0,
    taskCompletion: "Your response barely addresses the email task.",
    development: "Your ideas lack development and support.",
    languageUse: "Many errors that significantly affect clarity.",
    suggestions: [
      "Reread the prompt and try again.",
      "Focus on writing clear, complete thoughts.",
      "Review basic grammar.",
    ],
  },
  {
    score: 0.0,
    taskCompletion: "No response provided.",
    development: "No content to evaluate.",
    languageUse: "No content to evaluate.",
    suggestions: ["Please provide a response to the prompt."],
  },
];

/**
 * Rubric 점수 조회 함수
 */
export function getRubricByScore(score: number, isTask2: boolean = true): RubricCategory[] {
  return isTask2 ? TASK2_EMAIL_RUBRIC : TASK3_DISCUSSION_RUBRIC;
}

export function getScoreLabel(score: number): string {
  if (score >= 4.5) return "Excellent (5.0)";
  if (score >= 3.5) return "Good (4.0)";
  if (score >= 2.5) return "Fair (3.0)";
  if (score >= 1.5) return "Limited (2.0)";
  if (score >= 0.5) return "Incomplete (1.0)";
  return "No Attempt (0.0)";
}

export function getScoreColor(score: number): string {
  if (score >= 4.5) return "text-green-600 bg-green-50";
  if (score >= 3.5) return "text-blue-600 bg-blue-50";
  if (score >= 2.5) return "text-yellow-600 bg-yellow-50";
  if (score >= 1.5) return "text-orange-600 bg-orange-50";
  if (score >= 0.5) return "text-red-600 bg-red-50";
  return "text-gray-600 bg-gray-50";
}

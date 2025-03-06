// const FORMAT = "Please avoid mark-up format such as bold. No bulleting or numbering just new line";
// const FORMAT_QUIZ = "'Important: response with contents only (no intro/end sentences), and please format response with 1 question each line, no markup, after all questions print words 'AIanswer' follow by new line , then answer each question(seperated by new line), no markup.'";

// export const SUMMARIZE_PROMPT = "Summarize the website with no mark-up (Do not bold/italize/underline text in the response) and in a multi-paragraph format." 
// +" Also focus on content part of the website. For example, if the website is about a book, summarize the book content.";
// export const SUMMARIZE_PROMPT2 = "Summarize the website with no mark-up. (Do not bold/italize/underline text in the response) and in a multi-paragraph format seperated by double new line." 
// +" Also focus on content part of the website. For example, if the website is a book, e-book, article, or blog, focus on summarize that also. ";

// export const FLASHCARD_PROMPT = "create summary in flashcards format (a list of 'Keyword: defintion/idea' (enter new line for after finishing each keyword) *note: number of keywords depend on how much content in website. Also, only response with the flashcard contents only (i.e. no intro sentences, following question)) "+FORMAT+" of this website "

// export const QUIZ_PROMPT = "Generate 5-15 questions from the contents in website then provide answer of the above questions (depend on how much contents in website). The questions should relates to the contents concept/idea only (no question like what is the title) "+FORMAT_QUIZ+" The contents are ";

const SUMMARIZE_GOALS = "Summarize the website. Please focus on the content part of the website. For example, if the website is about chemistry, summarize the lesson.";
const FLASHCARD_GOALS = "Create a summary in flashcard format. List keyword on each line (Please focus on the content part of the website. For example, if the website is about chemistry, summarize the lesson.). *note: number of keywords depend on how much content in website. Also, only response with the flashcard contents only (i.e. no intro sentences, following question)) ";
const QUIZ_GOALS = "Generate 5-15 questions from the contents in website then provide answer of the above questions (depend on how much contents in website). The questions should relates to the contents concept/idea only (no question like what is the title) ";

const SUMMARIZE_FORMAT = " For the format, summarize in the multi-paragraph format. Do not bold, italicize, or underline text in the response. Separate paragraphs with a double new line.";
const FLASHCARD_FORMAT = " For the format, do not bold, italicize, or underline text in the response and no bulleting or numbering just enter a new line. The output of each line should be keyword follow by : and white space then definition/idea. Separate flashcards with a new line.";
const QUIZ_FORMAT = " For the format, do not bold, italicize, or underline text in the response and no bulleting or numbering just enter a new line. The output should be 1 question per line. After all questions, print 'AIanswer' followed by a new line. Then answer questions 1 per line (enter new line after finish).";

export const SUMMARIZE_PROMPT2 = SUMMARIZE_GOALS + SUMMARIZE_FORMAT + "The content of the website is: ";
export const FLASHCARD_PROMPT = FLASHCARD_GOALS + FLASHCARD_FORMAT + "The content of the website is: ";
export const QUIZ_PROMPT = QUIZ_GOALS + QUIZ_FORMAT + "The content of the website is: ";
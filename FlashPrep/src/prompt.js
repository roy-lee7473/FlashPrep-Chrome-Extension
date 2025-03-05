const FORMAT = "Please avoid mark-up format such as bold. No bulleting or numbering just new line";
const FORMAT_QUIZ = "'Important: response with contents only (no intro/end sentences), and please format response with 1 question each line, no markup, after all questions print words 'AIanswer' follow by new line , then answer each question(seperated by new line), no markup.'";

export const SUMMARIZE_PROMPT = "Summarize the website with no mark-up (Do not bold/italize/underline text in the response) and in a multi-paragraph format." 
+" Also focus on content part of the website. For example, if the website is about a book, summarize the book content.";
export const SUMMARIZE_PROMPT2 = "Summarize the website with no mark-up. (Do not bold/italize/underline text in the response) and in a multi-paragraph format." 
+" Also focus on content part of the website. For example, if the website is a book, e-book, article, or blog, focus on summarize that also. ";

export const FLASHCARD_PROMPT = "create summary in flashcards format (a list of 'Keyword: defintion/idea' (one line each) *note: number of keywords depend on how much content in website. Also, only response with the flashcard contents only (i.e. no intro sentences, following question)) "+FORMAT+" of this website "

export const QUIZ_PROMPT = "Generate 5-10 questions from the contents in website then provide answer of the above questions (depend on how much contents in website). The questions should relates to the contents concept/idea only (no question like what is the title) "+FORMAT_QUIZ+" The contents are ";
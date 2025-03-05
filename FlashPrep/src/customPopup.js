
(function () {
    
    const promptTypes = {
        summary: "summary",
        flashCards: "flashCards",
        quiz: "quiz"
    }

    // Create and inject the UI elements
    function createAndInjectUI() {
        if (!document.getElementById("extension-popup")) {
            // Fetch the popup.html content as a string
            console.log("Injecting popup");
            fetch(chrome.runtime.getURL('/public/popup.html'))
                .then(response => response.text())
                .then(html => {
                    const popupDiv = document.createElement("div");
                    popupDiv.id = "extension-popup";
                    // Remove class from popupDiv since it won't be visible in shadow DOM
                    
                    // Create a shadow root to isolate styles
                    const shadow = popupDiv.attachShadow({ mode: 'open' });
        
                    // Enhanced path replacement to add public/ for images
                    html = html.replace(
                        /(src|href)=["']([^"']+)["']/g,
                        (match, attr, path) => {
                            if (!path.startsWith('http') && !path.startsWith('data:')) {
                                if (path.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
                                    path = 'public/' + path.replace(/^\//, '');
                                }
                                return `${attr}="${chrome.runtime.getURL(path)}"`;
                            }
                            return match;
                        }
                    );
        
                    // Inject the CSS into the shadow DOM
                    const link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = chrome.runtime.getURL('/src/popup.css');
                    shadow.appendChild(link);
                    
                    // Create a container for the HTML content
                    const container = document.createElement('div');
                    container.className = "extension-popup"; // Add class here instead
                    container.innerHTML = html;
                    shadow.appendChild(container);
        
                    // Append the popup div to the body
                    document.body.appendChild(popupDiv);
                    
                    typeText(shadow, "Generating summary...", 25);
                    // Wait for DOM to be updated and initialize the counter
                    setTimeout(() => {
                        // Initialize event listeners
                        setupCounter(shadow);

                        // Restore extracted text from local storage instead of sync
                        readDocument(promptTypes.summary, (extractedText) => {
                            typeText(shadow, extractedText);
                        });
                    }, 0);
                })
                .catch(err => {
                    console.error("Error loading popup.html:", err);
                });
        }
    }

    // Storage helper (modified to work in content script)
    const counterStorage = {
        get: cb => {
            chrome.storage.sync.get(['count'], result => {
                cb(result.count);
            });
        },
        set: (value, cb) => {
            chrome.storage.sync.set(
                {
                    count: value,
                },
                () => {
                    cb();
                }
            );
        },
    };

    function setupCounter(shadow) {
        const exitButton = shadow.querySelector('.extension-popup .exitButton');
        const reloadButton = shadow.querySelector('.extension-popup .reloadButton');
        const copyButton = shadow.querySelector('.extension-popup .copyButton');
        const flashCardsButton = shadow.querySelector('.extension-popup .flashCardsButton');
        const quizButton = shadow.querySelector('.extension-popup .quizButton');
        
        if (exitButton) {
            exitButton.addEventListener('click', () => {
                exitPopup();
            });
        }
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                copyPrompt();
            });
        }
        if (reloadButton) {
            reloadButton.addEventListener('click', () => {
                reloadSummarizePrompt(shadow);
            });
        }
        if (flashCardsButton) {
            flashCardsButton.addEventListener('click', () => {
                flashCardPrompt(shadow);
            });
        }
        if (quizButton) {
            quizButton.addEventListener('click', () => {
                quizPrompt(shadow);
            });
        }
    }

    function updateDocumentReadText(shadow, text) {
        console.log(`new text: ${text}`);
        const textTitle = shadow.querySelector('#textTitle');
        const extractedText = shadow.querySelector('#extractedText');
        
        if (textTitle) textTitle.innerText = "Extracted Text:";
        if (extractedText) extractedText.innerHTML = text;
    }



    function typeText(shadow, htmlContent, speed = 1) {
        const extractedText = shadow.querySelector('#extractedText');
        extractedText.innerHTML = ""; // Clear existing text
    
        let tempDiv = document.createElement("div"); // Temporary container to parse HTML
        tempDiv.innerHTML = htmlContent; // Set HTML content for processing
    
        let nodes = Array.from(tempDiv.childNodes); // Extract nodes (text and elements)
        let index = 0;
    
        function typeNextNode() {
            if (index < nodes.length) {
                let node = nodes[index].cloneNode(true); // Clone to avoid modifying original
                index++;
    
                if (node.nodeType === Node.TEXT_NODE) {
                    // If it's a text node, type it out character by character
                    typeTextNode(node.textContent, speed, function(typedText) {
                        extractedText.innerHTML += typedText; // Append the typed text
                        typeNextNode(); // Continue with next node
                    });
                } else {
                    // If it's an element (e.g., <b>, <i>, <p>), append immediately
                    extractedText.appendChild(node);
                    typeNextNode(); // Continue with next node
                }
            }
        }
    
        typeNextNode(); // Start typing effect
    }
    
    // Function to type out text inside an element while keeping formatting
    function typeTextNode(text, speed, callback) {
        let i = 0;
        let typedText = "";
    
        function typeCharacter() {
            if (i < text.length) {
                typedText += text[i]; // Add next character
                i++;
                setTimeout(typeCharacter, speed);
            } else {
                callback(typedText); // Send back completed text after typing
            }
        }
    
        typeCharacter();
    }
    
    






    

    function readDocument(promptType, callback) {
        console.log("Reading document");
        const documentData = {
            website: window.location.hostname,
            content: document.querySelector('article')?.innerText || document.body.innerText,
            title: document.querySelector('h1')?.innerText || document.title,
            headings: Array.from(document.querySelectorAll("h1, h2, h3"))
                .map(h => h.innerText)
                .join(" "),
            pageURL: window.location.href,
            author: document.querySelector("[name='author']")?.content || 
                   document.querySelector(".author, .byline")?.innerText || "",
            pubDate: document.querySelector("time")?.dateTime || "",
            metadata: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            metakeywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
            images: Array.from(document.querySelectorAll("img")).map(img => img.src)
        };
        let msgType = 'SUMMARY';
        switch(promptType) {
            case promptTypes.flashCards:
                msgType = 'FLASHCARD';
                break;
            case promptTypes.quiz:
                msgType = 'QUIZ';
                break;
        }

        chrome.runtime.sendMessage({
            type: msgType,
            payload: documentData
        }, response => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
                return;
            }
            if(response && response.error) {
                callback("Error: "+response.error);
            }
            if (response && response.answer) {
                callback(response.answer);
            }
        });
    }

    function exitPopup() {
        console.log("Exiting popup");
        // Find the root popup div in the main document, not in shadow
        const popupDiv = document.getElementById('extension-popup');
        if (popupDiv) {
            popupDiv.remove();
        } else {
            console.log("Popup div not found");
        }
    }


    function copyPrompt() {
        console.log("copying text");
        chrome.storage.local.get("answer", (result) => {
            if (result.answer) {
                navigator.clipboard.writeText(result.answer)
                    .then(() => console.log("Extracted text copied to clipboard!"))
                    .catch(err => console.error("Failed to copy text:", err));
            } else {
                console.warn("No extracted text found in storage!");
            }
        });
    }

    function reloadSummarizePrompt(shadow) {
        typeText(shadow, "Regenerating summary...", 25);
        readDocument(promptTypes.summary, (answer) => {
            typeText(shadow, answer);
        });
    }

    function flashCardPrompt(shadow) {
        typeText(shadow, "Generating flash cards...", 25);
        readDocument(promptTypes.flashCards, (answer) => {
            typeText(shadow, answer);
        });
    }

    function quizPrompt(shadow) {
        typeText(shadow, "Generating quiz...", 25);
        readDocument(promptTypes.quiz, (answer) => {
            typeText(shadow, answer);
        });
    }

    function initialize() {
        console.log("Initializing");
        createAndInjectUI();
    }

    // Initialize when the content script loads
    initialize();
})();

(function () {
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
                    
        
                    // Wait for DOM to be updated and initialize the counter
                    setTimeout(() => {
                        // Initialize event listeners
                        setupCounter(shadow);

                        // Restore extracted text
                        chrome.storage.sync.get("extractedText", (data) => {
                            if (data.extractedText) {
                                updateDocumentReadText(shadow, data.extractedText);
                            }
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

    function setupCounter(shadow, initialValue = 0) {
        const readDocumentButton = shadow.querySelector('.extension-popup #readDocumentButton');
        const exitButton = shadow.querySelector('.extension-popup .exitButton');
        
        if (readDocumentButton) {
            readDocumentButton.addEventListener('click', () => {
                readDocument(shadow);
            });
        } else {
            console.log("Read Document button not found"); // Debug log
        }
        if (exitButton) {
            exitButton.addEventListener('click', () => {
                exitPopup(shadow);
            });
        }
    }

    function updateDocumentReadText(shadow, text) {
        const textTitle = shadow.querySelector('#textTitle');
        const extractedText = shadow.querySelector('#extractedText');
        
        if (textTitle) textTitle.innerText = "Extracted Text:";
        if (extractedText) extractedText.innerText = text;
    }

    function readDocument(shadow) {
        console.log("Reading document");
        const text = document.body.innerText;
        updateDocumentReadText(shadow, text);
        
        chrome.storage.sync.set({ extractedText: text }, () => {
            chrome.runtime.sendMessage({
                type: 'DATA_STORED',
                payload: { extractedText: text }
            });
        });
    }

    function exitPopup(shadow) {
        console.log("Exiting popup");
        // Find the root popup div in the main document, not in shadow
        const popupDiv = document.getElementById('extension-popup');
        if (popupDiv) {
            popupDiv.remove();
        } else {
            console.log("Popup div not found");
        }
    }

    function initialize() {
        console.log("Initializing");
        createAndInjectUI();
    }

    // Initialize when the content script loads
    initialize();
})();
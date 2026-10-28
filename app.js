const searchInput = document.getElementById('searchQuery');
const resultsDiv = document.getElementById('results');
const statusText = document.getElementById('status');
const counterText = document.getElementById('counter');

let fullCacheData = null; 
let typingDebounceTimer;

async function initDatabase() {
    statusText.textContent = "Connecting to 'search.json' dataset file...";
    try {
        const response = await fetch('search.json');
        if (!response.ok) throw new Error("File not found or local server missing.");
        
        fullCacheData = await response.json();
        statusText.textContent = `Successfully connected to repository database (${fullCacheData.length} records active). Ready to search!`;
    } catch (err) {
        statusText.innerHTML = `<span style="color: #dc2626; font-weight:600;">Security Error: Browser blocked local file reading via file:// protocol. Make sure your Python server is running!</span>`;
        console.error(err);
    }
}

initDatabase();

searchInput.addEventListener('input', function() {
    clearTimeout(typingDebounceTimer);
    const query = searchInput.value.trim();

    if (!fullCacheData) {
        statusText.textContent = "Please wait, database file is still connecting or blocked by local environment access rules.";
        return;
    }

    if (query.length < 2) {
        resultsDiv.innerHTML = '';
        counterText.textContent = "Matches: 0";
        statusText.textContent = "Type at least 2 characters to filter data lines...";
        return;
    }

    typingDebounceTimer = setTimeout(() => {
        performFiltering(query);
    }, 200);
});

function performFiltering(query) {
    resultsDiv.innerHTML = '';
    const lowercaseQuery = query.toLowerCase();
    let matchCount = 0;

    let i = 0;
    function processSlice() {
        const sliceLimit = Math.min(i + 150, fullCacheData.length);
        
        for (; i < sliceLimit; i++) {
            const item = fullCacheData[i];
            
            const haystack = (
                (item.title || "") + " " + 
                (item.tags || "") + " " + 
                (item.notable || "") + " " +
                (item.author || "") + " " +
                (item.articleID || "")
            ).toLowerCase();

            if (haystack.includes(lowercaseQuery)) {
                matchCount++;
                renderResultCard(item, query);
            }
        }

        counterText.textContent = `Matches: ${matchCount}`;

        if (i < fullCacheData.length) {
            statusText.textContent = `Filtering database index entries... ${Math.round((i / fullCacheData.length) * 100)}% parsed`;
            setTimeout(processSlice, 1);
        } else {
            statusText.textContent = `Scan complete! Found ${matchCount} corresponding match profiles out of ${fullCacheData.length} rows.`;
        }
    }

    processSlice();
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, searchStr) {
    if (!text || !searchStr) return text || '';
    const escapedSearch = escapeRegExp(searchStr);
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function renderResultCard(item, currentQuery) {
    let formattedDate = 'Unknown';
    let pageNumber = 'Unknown';
    
    if (item.articleID && item.articleID.length >= 8) {
        const rawId = item.articleID;
        
        const year = rawId.substring(0, 4);
        const month = rawId.substring(4, 6);
        const day = rawId.substring(6, 8);
        formattedDate = `${month}/${day}/${year}`;
        
        const segments = rawId.split('-');
        if (segments.length > 1) {
            pageNumber = parseInt(segments[1], 10).toString();
        }
    }

    const card = document.createElement('div');
    card.className = 'card';
    
    const displayTitle = highlightText(item.title, currentQuery);
    const displayAuthor = highlightText(item.author, currentQuery);
    const displayNotable = highlightText(item.notable, currentQuery);
    const displayTags = highlightText(item.tags, currentQuery);
    const displayArticleID = highlightText(item.articleID, currentQuery);
    const displayNotes = item.notes && item.notes !== 'NULL' ? highlightText(item.notes, currentQuery) : '';

    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${displayTitle || 'Untitled Article'}</h3>
            <span class="badge">ID: ${item.sID || 'N/A'}</span>
        </div>
        <div class="meta-line"><strong>Issue Date:</strong> ${formattedDate}</div>
        <div class="meta-line"><strong>Page #:</strong> ${pageNumber}</div>
        <div class="meta-line"><strong>Article Key:</strong> ${displayArticleID}</div>
        <div class="meta-line"><strong>Author:</strong> ${displayAuthor.trim() ? displayAuthor : 'Anonymous'}</div>
        <div class="meta-line"><strong>Notable Entities:</strong> ${displayNotable.trim() ? displayNotable : 'None'}</div>
        <div class="meta-line"><strong>Tags:</strong> ${displayTags || 'Uncategorized'}</div>
        ${displayNotes ? `<div class="meta-line"><strong>Notes:</strong> ${displayNotes}</div>` : ''}
    `;
    
    resultsDiv.appendChild(card);
}
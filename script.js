// AI Disclaimer Modal Logic
function initializeDisclaimerModal() {
  const modal = document.getElementById('disclaimerModal');
  const acceptButton = document.getElementById('acceptDisclaimer');
  const hasAcceptedDisclaimer = localStorage.getItem('careerExplorerDisclaimerAccepted');
  
  // Check if user has already accepted the disclaimer
  if (hasAcceptedDisclaimer === 'true') {
    // User has already accepted, hide modal and allow interaction
    modal.classList.add('hidden');
    enableSiteInteraction();
  } else {
    // First visit or disclaimer not accepted, show modal
    modal.classList.remove('hidden');
    disableSiteInteraction();
  }
  
  // Handle accept button click
  acceptButton.addEventListener('click', function() {
    // Store acceptance in localStorage
    localStorage.setItem('careerExplorerDisclaimerAccepted', 'true');
    
    // Hide modal with animation
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.style.opacity = '1';
    }, 300);
    
    // Enable site interaction
    enableSiteInteraction();
  });
}

function disableSiteInteraction() {
  // Disable all interactive elements except the modal
  const interactiveElements = document.querySelectorAll('button:not(#acceptDisclaimer), a, input, select, textarea');
  interactiveElements.forEach(element => {
    if (!element.closest('#disclaimerModal')) {
      element.style.pointerEvents = 'none';
      element.style.opacity = '0.5';
    }
  });
  
  // Prevent scrolling
  document.body.style.overflow = 'hidden';
}

function enableSiteInteraction() {
  // Re-enable all interactive elements
  const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
  interactiveElements.forEach(element => {
    element.style.pointerEvents = 'auto';
    element.style.opacity = '1';
  });
  
  // Allow scrolling
  document.body.style.overflow = 'auto';
}

let currentData = null;
let currentView = 'categories'; // 'categories', 'careers', 'details'
let currentCategory = null;

// Education pathway filter state
let educationFilters = {
  include: [], // pathways to include (show only careers with these)
  exclude: []  // pathways to exclude (hide careers with these)
};

// Salary sorting state
let salarySort = 'none'; // 'none', 'ascending', 'descending'

// Search state
let searchQuery = ''; // Current search query

// Exchange rate for salary conversions
const USD_TO_ZAR_RATE = 18.5; // Approximate exchange rate (updates as needed)

// SEO Functions for dynamic meta updates
function updatePageSEO(title, description, keywords = '') {
  // Update page title
  document.title = title;
  
  // Update meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description);
  }
  
  // Update meta keywords if provided
  if (keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', keywords);
    }
  }
  
  // Update Open Graph title and description
  let ogTitle = document.querySelector('meta[property="og:title"]');
  let ogDesc = document.querySelector('meta[property="og:description"]');
  
  if (ogTitle) ogTitle.setAttribute('content', title);
  if (ogDesc) ogDesc.setAttribute('content', description);
  
  // Update Twitter Card
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  let twitterDesc = document.querySelector('meta[name="twitter:description"]');
  
  if (twitterTitle) twitterTitle.setAttribute('content', title);
  if (twitterDesc) twitterDesc.setAttribute('content', description);
}

function generateCareerStructuredData(careerData, category) {
  if (!careerData || typeof careerData === 'string') return null;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": careerData.name,
    "description": careerData.briefDescription || `Career information for ${careerData.name}`,
    "industry": category,
    "occupationalCategory": category,
    "qualifications": careerData.skills ? careerData.skills.join(', ') : '',
    "educationRequirements": careerData.educationPathways ? 
      (Array.isArray(careerData.educationPathways) ? 
        careerData.educationPathways.map(p => p.route).join(', ') : 
        Object.keys(careerData.educationPathways).join(', ')) : '',
    "workHours": careerData.typicalWorkingHours || 'Standard business hours',
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Various Employers"
    }
  };
  
  // Add salary information if available
  if (careerData.salaryRange) {
    const salaryData = typeof careerData.salaryRange === 'object' ? 
      careerData.salaryRange.international || careerData.salaryRange.southAfrica : 
      careerData.salaryRange;
    
    structuredData.baseSalary = {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": {
        "@type": "QuantitativeValue",
        "value": salaryData
      }
    };
  }
  
  return structuredData;
}

function addStructuredDataToPage(data) {
  // Remove existing structured data for career
  const existingScript = document.querySelector('script[data-career-structured-data]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-career-structured-data', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

async function loadCareers() {
  const res = await fetch('./careersData.json');
  const data = await res.json();

  // Extract careers and metadata
  currentData = data.careers || data; // Handle both old and new format
  const totalCareers = data.metadata ? data.metadata.totalCareers : Object.values(currentData).reduce((sum, category) => sum + category.length, 0);

  // Update main heading with total careers
  const mainHeading = document.querySelector('h1');
  if (mainHeading) {
    mainHeading.textContent = `Career Explorer (${totalCareers} Careers Found For Now 🫠)`;
  }

  // Add last updated date
  const lastUpdated = document.getElementById('lastUpdated');
  if (lastUpdated && data.metadata && data.metadata.generatedAt) {
    const updateDate = new Date(data.metadata.generatedAt);
    const formattedDate = updateDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    lastUpdated.textContent = `Last updated: ${formattedDate}`;
    lastUpdated.style.display = 'block';
  }

  showCategoriesView();
}

function showCategoriesView() {
  currentView = 'categories';
  currentCategory = null;
  
  // Update SEO for categories page
  const totalCareers = Object.values(currentData).reduce((sum, category) => sum + category.length, 0);
  updatePageSEO(
    'Career Explorer - Discover 1400+ Career Paths with Education Routes & Salary Info',
    `Explore ${totalCareers}+ careers across Technology, Healthcare, Finance, Engineering, Education, Arts, Science and Creative fields. Find education pathways, salary ranges, and career requirements.`,
    'career explorer, career guidance, job search, education pathways, salary information, technology careers, healthcare careers, engineering careers'
  );
  
  const container = document.getElementById('categoryList');
  const detailsSection = document.getElementById('careerDetails');
  
  // Hide details and clear
  detailsSection.classList.add('hidden');
  detailsSection.innerHTML = '';
  
  // Show categories
  container.innerHTML = '';
  container.style.display = 'block';
  
  // Create global search bar
  const globalSearchBar = document.createElement('div');
  globalSearchBar.className = 'global-search-bar';
  globalSearchBar.innerHTML = `
    <div class="global-search-container">
      <input 
        type="text" 
        id="globalCareerSearchInput" 
        placeholder="🔍 Search all careers across categories (e.g., 'Software Engineer', 'Doctor', 'Teacher'...)" 
        value="${searchQuery}"
        oninput="performGlobalSearch(this.value)"
        class="global-search-input"
      />
      ${searchQuery ? `<button onclick="clearGlobalSearch()" class="clear-search-btn" title="Clear search">✕</button>` : ''}
    </div>
    <div id="globalSearchResults" class="global-search-results" style="display: none;"></div>
  `;
  
  container.appendChild(globalSearchBar);
  
  // Create categories grid container
  const gridContainer = document.createElement('div');
  gridContainer.className = 'categories-grid';
  
  // Create category cards
  Object.keys(currentData).forEach(category => {
    const categoryCard = document.createElement('div');
    categoryCard.className = 'category-overview-card';
    
    const careerCount = currentData[category].length;
    
    // Enhanced descriptions for each category
    const categoryDescriptions = {
      'Technology': 'Discover cutting-edge careers in software development, cybersecurity, data science, and emerging technologies that are shaping our digital future.',
      'Healthcare': 'Explore rewarding careers dedicated to improving lives through medical care, research, mental health, and innovative healthcare solutions.',
      'Engineering': 'Build the future with careers in civil, mechanical, electrical, and environmental engineering that solve real-world challenges.',
      'Business': 'Lead and innovate in the corporate world with careers in management, finance, marketing, consulting, and entrepreneurship.',
      'Education': 'Inspire and educate the next generation through teaching, curriculum development, educational technology, and academic research.',
      'Arts': 'Express creativity and culture through careers in visual arts, performing arts, design, writing, and creative media production.',
      'Science': 'Advance human knowledge through research and discovery in biology, chemistry, physics, environmental science, and emerging fields.',
      'Finance': 'Navigate the world of money and investments through careers in banking, financial planning, investment analysis, and fintech innovation.'
    };
    
    // Background images for each category
    const categoryImages = {
      'Technology': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'Healthcare': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'Engineering': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'Business': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'Education': 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'Arts': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'Creative' :'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'Science': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      'Finance': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    };
    
    // Set background image for this category
    const backgroundImage = categoryImages[category] || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
    categoryCard.style.backgroundImage = `linear-gradient(135deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${backgroundImage})`;
    
    categoryCard.innerHTML = `
      <h2>${category}</h2>
      <p class="category-description">${categoryDescriptions[category] || `Explore diverse career opportunities in ${category.toLowerCase()}.`}</p>
      <div class="category-stats">
        <span class="career-count">${careerCount} Careers Available</span>
      </div>
    `;
    
    categoryCard.addEventListener('click', () => showCareersView(category));
    gridContainer.appendChild(categoryCard);
  });
  
  container.appendChild(gridContainer);
}

// Education pathway filtering functions
function getCareerPathways(career) {
  const pathways = [];
  
  if (typeof career === 'string') {
    // For string careers, we can't determine pathways
    return pathways;
  }
  
  if (career.educationPathways) {
    if (Array.isArray(career.educationPathways)) {
      // New format - array of pathway objects
      career.educationPathways.forEach(pathway => {
        const route = pathway.route?.toLowerCase() || '';
        if (route.includes('formal') || route.includes('degree') || route.includes('university') || route.includes('college')) {
          pathways.push('formal');
        }
        if (route.includes('self-taught') || route.includes('autodidact') || route.includes('self-directed')) {
          pathways.push('selfTaught');
        }
        if (route.includes('certificate') || route.includes('bootcamp') || route.includes('certification')) {
          pathways.push('certificate');
        }
        if (route.includes('alternative') || route.includes('non-traditional') || route.includes('apprentice')) {
          pathways.push('alternative');
        }
      });
    } else {
      // Old format - object with pathway types
      if (career.educationPathways.formal) pathways.push('formal');
      if (career.educationPathways.selfTaught) pathways.push('selfTaught');
      if (career.educationPathways.certificate) pathways.push('certificate');
      if (career.educationPathways.alternative) pathways.push('alternative');
    }
  }
  
  return [...new Set(pathways)]; // Remove duplicates
}

function filterCareersByEducation(careers) {
  return careers.filter(career => {
    const pathways = getCareerPathways(career);
    
    // If no pathways detected and we have include filters, exclude this career
    if (pathways.length === 0 && educationFilters.include.length > 0) {
      return false;
    }
    
    // Check include filters - career must have at least one included pathway
    if (educationFilters.include.length > 0) {
      const hasIncludedPathway = educationFilters.include.some(pathway => 
        pathways.includes(pathway)
      );
      if (!hasIncludedPathway) return false;
    }
    
    // Check exclude filters - career must not have any excluded pathways
    if (educationFilters.exclude.length > 0) {
      const hasExcludedPathway = educationFilters.exclude.some(pathway => 
        pathways.includes(pathway)
      );
      if (hasExcludedPathway) return false;
    }
    
    return true;
  });
}

function toggleEducationFilter(pathway) {
  // Determine current state first (before removing)
  const isIncluded = educationFilters.include.includes(pathway);
  const isExcluded = educationFilters.exclude.includes(pathway);
  
  // Remove from both arrays to reset
  educationFilters.include = educationFilters.include.filter(p => p !== pathway);
  educationFilters.exclude = educationFilters.exclude.filter(p => p !== pathway);
  
  // Cycle through states: neutral → include → exclude → neutral
  if (!isIncluded && !isExcluded) {
    // Currently neutral → add to include
    educationFilters.include.push(pathway);
  } else if (isIncluded && !isExcluded) {
    // Currently included → add to exclude
    educationFilters.exclude.push(pathway);
  }
  // If currently excluded → stay neutral (already removed from both arrays)
  
  // Refresh the current careers view
  if (currentCategory) {
    showCareersView(currentCategory);
  }
}

// Salary sorting functions
function parseSalaryRange(career) {
  let salaryString = '';
  
  if (typeof career === 'string') {
    return { min: 0, max: 0, raw: 'Not specified' }; // String careers have no salary data
  }
  
  // Handle new object structure
  const salaryData = career.salaryRange;
  if (typeof salaryData === 'object' && salaryData !== null) {
    // Use international salary for sorting by default
    salaryString = salaryData.international || 'Not specified';
  } else {
    // Handle legacy string format
    salaryString = salaryData || 'Not specified';
  }
  
  // Extract numbers from salary string (e.g., "$50,000 - $80,000", "$60K-$90K", etc.)
  const numbers = salaryString.match(/[\d,]+/g);
  
  if (!numbers || numbers.length === 0) {
    return { min: 0, max: 0, raw: salaryString };
  }
  
  // Convert strings to numbers (remove commas)
  const numericValues = numbers.map(num => parseInt(num.replace(/,/g, '')));
  
  // Handle "K" notation (multiply by 1000)
  if (salaryString.toLowerCase().includes('k')) {
    numericValues.forEach((val, index) => {
      if (val < 1000) { // Likely in K format
        numericValues[index] = val * 1000;
      }
    });
  }
  
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  
  return { min, max, raw: salaryString };
}

function sortCareersBySalary(careers) {
  if (salarySort === 'none') {
    return careers;
  }
  
  return [...careers].sort((a, b) => {
    const salaryA = parseSalaryRange(a);
    const salaryB = parseSalaryRange(b);
    
    // Use average of min and max for comparison, or just min if max is 0
    const avgA = salaryA.max > 0 ? (salaryA.min + salaryA.max) / 2 : salaryA.min;
    const avgB = salaryB.max > 0 ? (salaryB.min + salaryB.max) / 2 : salaryB.min;
    
    // Put "Not specified" salaries at the end
    if (avgA === 0 && avgB === 0) return 0;
    if (avgA === 0) return 1;
    if (avgB === 0) return -1;
    
    if (salarySort === 'ascending') {
      return avgA - avgB;
    } else if (salarySort === 'descending') {
      return avgB - avgA;
    }
    
    return 0;
  });
}

function toggleSalarySort() {
  // Cycle through: none → ascending → descending → none
  if (salarySort === 'none') {
    salarySort = 'ascending';
  } else if (salarySort === 'ascending') {
    salarySort = 'descending';
  } else {
    salarySort = 'none';
  }
  
  // Refresh the current careers view
  if (currentCategory) {
    showCareersView(currentCategory);
  }
}

// Search functions
function performSearch(query) {
  searchQuery = query.toLowerCase().trim();
  
  // If we're currently viewing a category, refresh it to apply search
  if (currentCategory) {
    showCareersView(currentCategory);
  }
}

function performGlobalSearch(query) {
  searchQuery = query.toLowerCase().trim();
  const resultsContainer = document.getElementById('globalSearchResults');
  
  if (!searchQuery) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
    return;
  }
  
  // Search across all categories
  const allResults = [];
  for (const [category, careers] of Object.entries(currentData)) {
    careers.forEach(career => {
      const careerName = typeof career === 'string' ? career : career.name;
      if (careerName && careerName.toLowerCase().includes(searchQuery)) {
        allResults.push({
          career: career,
          category: category,
          name: careerName
        });
      }
    });
  }
  
  // Display results
  if (allResults.length === 0) {
    resultsContainer.innerHTML = `
      <div class="no-global-results">
        <p>No careers found for "${query}"</p>
        <p class="search-hint">Try searching for terms like "engineer", "doctor", "teacher", "software", etc.</p>
      </div>
    `;
  } else {
    const resultHTML = allResults.map(result => {
      const career = result.career;
      const careerDescription = typeof career === 'string' ? 'Click to view details' : (career.briefDescription || 'No description available');
      const salaryDisplay = formatSalaryForDisplay(career);
      
      // Apply highlighting to career name and description
      const highlightedName = highlightSearchText(result.name, searchQuery);
      const highlightedDescription = highlightSearchText(careerDescription, searchQuery);
      
      return `
        <div class="global-result-card" onclick="showCareerDetails('${result.name}', '${result.category}')">
          <div class="result-header">
            <h4>${highlightedName}</h4>
            <span class="result-category">${result.category}</span>
          </div>
          <p class="result-description">${highlightedDescription}</p>
          <div class="result-salary">${salaryDisplay}</div>
        </div>
      `;
    }).join('');
    
    resultsContainer.innerHTML = `
      <div class="global-results-header">
        <h3>Found ${allResults.length} career${allResults.length !== 1 ? 's' : ''} matching "<span class="search-query-highlight">${query}</span>"</h3>
      </div>
      <div class="global-results-grid">
        ${resultHTML}
      </div>
    `;
  }
  
  resultsContainer.style.display = 'block';
}

function clearGlobalSearch() {
  searchQuery = '';
  document.getElementById('globalCareerSearchInput').value = '';
  document.getElementById('globalSearchResults').style.display = 'none';
  document.getElementById('globalSearchResults').innerHTML = '';
}

function highlightSearchText(text, searchQuery) {
  if (!searchQuery || !text) {
    return text;
  }
  
  // Create a case-insensitive regex that matches the search query
  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  
  // Replace matches with highlighted version
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function filterCareersBySearch(careers) {
  if (!searchQuery) {
    return careers;
  }
  
  return careers.filter(career => {
    if (typeof career === 'string') {
      return career.toLowerCase().includes(searchQuery);
    }
    
    // Search in career name
    return career.name && career.name.toLowerCase().includes(searchQuery);
  });
}

function clearSearch() {
  searchQuery = '';
  document.getElementById('careerSearchInput').value = '';
  
  // Refresh the current view
  if (currentCategory) {
    showCareersView(currentCategory);
  }
}

// Currency conversion functions
function convertToZAR(usdAmount) {
  return Math.round(usdAmount * USD_TO_ZAR_RATE);
}

function convertUSDSalaryStringToZAR(usdSalaryString) {
  if (!usdSalaryString || usdSalaryString === 'Not specified') {
    return 'Not specified';
  }
  
  try {
    // Extract numbers from the USD salary string
    const numbers = usdSalaryString.match(/[\d,]+/g);
    if (!numbers || numbers.length === 0) {
      return usdSalaryString;
    }
    
    // Convert to numeric values
    let numericValues = numbers.map(num => parseInt(num.replace(/,/g, '')));
    
    // Handle "K" notation
    if (usdSalaryString.toLowerCase().includes('k')) {
      numericValues = numericValues.map(val => val < 1000 ? val * 1000 : val);
    }
    
    // Convert to ZAR
    const zarValues = numericValues.map(val => convertToZAR(val));
    
    // Format the result
    if (zarValues.length === 1) {
      return `R${zarValues[0].toLocaleString()}`;
    } else if (zarValues.length === 2) {
      return `R${Math.min(...zarValues).toLocaleString()} - R${Math.max(...zarValues).toLocaleString()}`;
    }
    
    return `R${zarValues[0].toLocaleString()}+`;
  } catch (error) {
    console.error('Error converting USD salary to ZAR:', error);
    return usdSalaryString;
  }
}

function formatSalaryForDisplay(career) {
  if (typeof career === 'string') {
    return 'Not specified';
  }
  
  const salaryData = career.salaryRange;
  
  if (!salaryData) {
    return 'Not specified';
  }
  
  // Handle new object structure with international and South African salaries
  if (typeof salaryData === 'object' && salaryData !== null) {
    const international = salaryData.international || 'Not specified';
    const southAfrica = salaryData.southAfrica || 'Not specified';
    
    // Convert international USD salary to ZAR for comparison
    const internationalInZAR = convertUSDSalaryStringToZAR(international);
    
    return `
      <div class="salary-breakdown">
        <div class="salary-international">🌍 Global: ${internationalInZAR}</div>
        <div class="salary-local">🇿🇦 Local: ${southAfrica}</div>
      </div>
    `;
  }
  
  // Handle legacy string format (for backward compatibility)
  if (typeof salaryData === 'string') {
    const originalSalary = salaryData;
    
    if (originalSalary === 'Not specified') {
      return originalSalary;
    }
    
    // For legacy data, convert USD to ZAR if it contains USD indicators
    if (originalSalary.includes('$') || originalSalary.toLowerCase().includes('usd')) {
      try {
        // Extract numbers from the original salary string
        const numbers = originalSalary.match(/[\d,]+/g);
        if (!numbers || numbers.length === 0) {
          return originalSalary + ' (USD)';
        }
        
        // Convert to numeric values
        let numericValues = numbers.map(num => parseInt(num.replace(/,/g, '')));
        
        // Handle "K" notation
        if (originalSalary.toLowerCase().includes('k')) {
          numericValues = numericValues.map(val => val < 1000 ? val * 1000 : val);
        }
        
        // Convert to ZAR
        const zarValues = numericValues.map(val => convertToZAR(val));
        
        // Format the result
        if (zarValues.length === 1) {
          return `R${zarValues[0].toLocaleString()}`;
        } else if (zarValues.length === 2) {
          return `R${Math.min(...zarValues).toLocaleString()} - R${Math.max(...zarValues).toLocaleString()}`;
        }
        
        return `R${zarValues[0].toLocaleString()}+`;
      } catch (error) {
        return originalSalary + ' (USD)';
      }
    }
    
    // If it's already in ZAR or other format, return as-is
    return originalSalary;
  }
  
  return 'Not specified';
}

function showCareersView(category) {
  currentView = 'careers';
  currentCategory = category;
  
  // Update SEO for category page
  const careerCount = currentData[category] ? currentData[category].length : 0;
  updatePageSEO(
    `${category} Careers - ${careerCount} Jobs | Career Explorer`,
    `Discover ${careerCount} ${category.toLowerCase()} careers with detailed salary information, education pathways, and skill requirements. Find your perfect ${category.toLowerCase()} job today.`,
    `${category.toLowerCase()} careers, ${category.toLowerCase()} jobs, ${category.toLowerCase()} salary, career guidance, education pathways`
  );
  
  const container = document.getElementById('categoryList');
  const detailsSection = document.getElementById('careerDetails');
  
  // Hide details
  detailsSection.classList.add('hidden');
  detailsSection.innerHTML = '';
  
  // Apply education pathway filtering
  const educationFilteredCareers = filterCareersByEducation(currentData[category]);
  
  // Apply salary sorting
  const sortedCareers = sortCareersBySalary(educationFilteredCareers);
  
  // Show careers for this category
  container.innerHTML = '';
  
  // Create header with back button
  const header = document.createElement('div');
  header.className = 'careers-view-header';
  header.innerHTML = `
    <button onclick="showCategoriesView()" class="back-button">← Back to Categories</button>
    <div class="careers-view-title">
      <h2>${category} Careers</h2>
      <p class="careers-count">${sortedCareers.length} of ${currentData[category].length} careers shown</p>
    </div>
  `;
  
  // Create education pathway filter bar
  const filterBar = document.createElement('div');
  filterBar.className = 'education-filter-bar';
  
  const pathwayFilters = [
    { key: 'formal', label: '🎓 Formal Education', description: 'University/College Degrees' },
    { key: 'selfTaught', label: '💻 Self-Taught', description: 'Learn on Your Own' },
    { key: 'certificate', label: '📜 Certificate/Bootcamp', description: 'Short-term Programs' },
    { key: 'alternative', label: '🛤️ Alternative Paths', description: 'Non-traditional Routes' }
  ];
  
  let filterHTML = `
    <div class="filter-bar-header">
      <h3>Filter by Education Pathway</h3>
      <p class="filter-instructions">
        <strong>Click once:</strong> Show ONLY careers with this pathway (✅ Include) &nbsp;•&nbsp; 
        <strong>Click twice:</strong> HIDE careers with this pathway (❌ Exclude) &nbsp;•&nbsp; 
        <strong>Click third time:</strong> Reset to neutral
      </p>
    </div>
    <div class="filter-buttons">`;
  
  pathwayFilters.forEach(filter => {
    const isIncluded = educationFilters.include.includes(filter.key);
    const isExcluded = educationFilters.exclude.includes(filter.key);
    
    let buttonClass = 'filter-button';
    let statusIndicator = '';
    let statusText = '';
    
    if (isIncluded) {
      buttonClass += ' filter-included';
      statusIndicator = '✅';
      statusText = 'INCLUDED';
    } else if (isExcluded) {
      buttonClass += ' filter-excluded';
      statusIndicator = '❌';
      statusText = 'EXCLUDED';
    }
    
    filterHTML += `
      <button class="${buttonClass}" onclick="toggleEducationFilter('${filter.key}')" title="${filter.description}">
        <div class="filter-button-content">
          <span class="filter-label">${filter.label}</span>
          <span class="filter-status">${statusIndicator} ${statusText}</span>
        </div>
      </button>
    `;
  });
  
  filterHTML += '</div>';
  
  // Add salary sorting section
  let salarySortLabel = '';
  let salarySortClass = 'salary-sort-button';
  
  if (salarySort === 'ascending') {
    salarySortLabel = '💰 Salary: Low to High ⬆️';
    salarySortClass += ' salary-sort-active';
  } else if (salarySort === 'descending') {
    salarySortLabel = '💰 Salary: High to Low ⬇️';
    salarySortClass += ' salary-sort-active';
  } else {
    salarySortLabel = '💰 Sort by Salary';
  }
  
  filterHTML += `
    <div class="salary-sort-section">
      <h3>Sort & Display Options</h3>
      <div class="sort-display-buttons">
        <button class="${salarySortClass}" onclick="toggleSalarySort()">
          ${salarySortLabel}
        </button>
      </div>
    </div>
  `;
  
  // Add active filters summary
  let summaryHTML = '';
  if (educationFilters.include.length > 0 || educationFilters.exclude.length > 0) {
    summaryHTML += '<div class="filter-summary">';
    
    if (educationFilters.include.length > 0) {
      const includeLabels = educationFilters.include.map(key => 
        pathwayFilters.find(f => f.key === key)?.label || key
      );
      summaryHTML += `<div class="summary-line"><strong>✅ Showing only careers with:</strong> ${includeLabels.join(', ')}</div>`;
    }
    
    if (educationFilters.exclude.length > 0) {
      const excludeLabels = educationFilters.exclude.map(key => 
        pathwayFilters.find(f => f.key === key)?.label || key
      );
      summaryHTML += `<div class="summary-line"><strong>❌ Hiding careers with:</strong> ${excludeLabels.join(', ')}</div>`;
    }
    
    summaryHTML += '<button class="clear-filters-button" onclick="clearEducationFilters()">Clear All Filters</button></div>';
  }
  
  filterBar.innerHTML = filterHTML + summaryHTML;
  
  // Create careers grid
  const grid = document.createElement('div');
  grid.className = 'careers-grid';
  
  if (sortedCareers.length === 0) {
    const hasFilters = educationFilters.include.length > 0 || educationFilters.exclude.length > 0;
    
    let noResultsMessage = '<h3>No careers found</h3>';
    let actionMessage = '<p>';
    
    if (hasFilters) {
      noResultsMessage = '<h3>No careers match your current filters</h3>';
      actionMessage += `Try <button onclick="clearEducationFilters()" class="inline-clear-button">clearing filters</button>`;
    } else {
      noResultsMessage = '<h3>No careers available</h3>';
      actionMessage += 'Please try refreshing the page';
    }
    
    actionMessage += '</p>';
    
    grid.innerHTML = `
      <div class="no-results">
        ${noResultsMessage}
        ${actionMessage}
      </div>
    `;
  } else {
    sortedCareers.forEach(career => {
      const card = document.createElement('div');
      card.className = 'career-card';
      
      // Handle both string names and career objects
      const careerName = typeof career === 'string' ? career : career.name;
      const careerDescription = typeof career === 'string' ? 'Click to view details' : (career.briefDescription || 'No description available');
      const careerSalary = formatSalaryForDisplay(career);
      
      card.innerHTML = `
        <h3>${careerName}</h3>
        <p class="description">${careerDescription}</p>
        <p class="salary"><strong>Potential Annual Salary:</strong> ${careerSalary}</p>
      `;
      
      card.addEventListener('click', () => showCareerDetails(career, category));
      grid.appendChild(card);
    });
  }
  
  container.appendChild(header);
  container.appendChild(filterBar);
  container.appendChild(grid);
  container.style.display = 'block';
}

function clearEducationFilters() {
  educationFilters.include = [];
  educationFilters.exclude = [];
  
  // Refresh the current careers view
  if (currentCategory) {
    showCareersView(currentCategory);
  }
}

function showCareerDetails(career, category) {
  currentView = 'details';
  
  const container = document.getElementById('categoryList');
  const detailsSection = document.getElementById('careerDetails');
  
  // Hide the careers list
  container.style.display = 'none';
  
  // Get career name and data
  let careerName, careerData;
  
  if (typeof career === 'string') {
    // Career is just a name (from global search), need to find the full data
    careerName = career;
    careerData = null;
    
    // Search for the career in the specified category
    if (currentData[category]) {
      const foundCareer = currentData[category].find(c => {
        return typeof c === 'string' ? c === careerName : c.name === careerName;
      });
      
      if (foundCareer && typeof foundCareer !== 'string') {
        careerData = foundCareer;
      }
    }
  } else {
    // Career is already a full object
    careerName = career.name;
    careerData = career;
  }
  
  // Update SEO for career details page
  const description = careerData && careerData.briefDescription ? 
    careerData.briefDescription : 
    `Explore career details for ${careerName} including education pathways, salary information, skills required, and job outlook.`;
  
  updatePageSEO(
    `${careerName} Career Guide - Salary, Education & Skills | Career Explorer`,
    description,
    `${careerName.toLowerCase()}, ${careerName.toLowerCase()} career, ${careerName.toLowerCase()} salary, ${careerName.toLowerCase()} education, ${category.toLowerCase()} careers`
  );
  
  // Add structured data for this career
  if (careerData) {
    const structuredData = generateCareerStructuredData(careerData, category);
    if (structuredData) {
      addStructuredDataToPage(structuredData);
    }
  } else {
    // Career is already a full object
    careerName = career.name;
    careerData = career;
  }
  
  // Create the details content with enhanced navigation
  detailsSection.innerHTML = `
    <div class="career-details-header">
      <button onclick="showCareersView('${category}')" class="back-button">← Back to ${category} Careers</button>
      <div class="breadcrumb">
        <span onclick="showCategoriesView()" class="breadcrumb-link">Categories</span> → 
        <span onclick="showCareersView('${category}')" class="breadcrumb-link">${category}</span> → 
        <span class="breadcrumb-current">${careerName}</span>
      </div>
    </div>
    
    <div class="career-details-content">
      <h1>${careerName}</h1>
      
      ${careerData ? `
        <div class="career-overview">
          <div class="overview-card overview-description">
            <div class="overview-content">
              <h3>📋 Overview</h3>
              <p>${careerData.briefDescription || 'No description available'}</p>
            </div>
          </div>
          
          <div class="overview-card overview-salary">
            <div class="overview-content">
              <h3>💰 Annual Salary Range</h3>
              <p class="salary-range">${formatSalaryForDisplay(careerData)}</p>
              <span class="salary-note">*Salaries vary by location, experience, and company size</span>
            </div>
          </div>
          
          <div class="overview-card overview-hours">
            <div class="overview-content">
              <h3>⏰ Typical Working Hours</h3>
              <p class="working-hours">${careerData.typicalWorkingHours || 'Not specified'}</p>
              <span class="hours-note">*May vary depending on role and employer</span>
            </div>
          </div>
        </div>
        
        ${careerData.responsibilities && careerData.responsibilities.length > 0 ? `
          <div class="section">
            <h3>Key Responsibilities</h3>
            <ul class="responsibilities-list">
              ${careerData.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${careerData.skills && careerData.skills.length > 0 ? `
          <div class="section">
            <h3>Required Skills</h3>
            <div class="skills-grid">
              ${careerData.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        ${careerData.educationPathways ? `
          <div class="section">
            <h3>Education Pathways</h3>
            <div class="education-pathways">
              ${generateEducationPathwaysHTML(careerData.educationPathways)}
            </div>
          </div>
        ` : ''}
        
        ${careerData.pros && careerData.cons ? `
          <div class="pros-cons-section">
            <div class="pros-section">
              <h3>✅ Advantages</h3>
              <ul class="pros-list">${careerData.pros.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
            <div class="cons-section">
              <h3>⚠️ Challenges</h3>
              <ul class="cons-list">${careerData.cons.map(c => `<li>${c}</li>`).join('')}</ul>
            </div>
          </div>
        ` : ''}
        
        ${careerData.workEnvironment ? `
          <div class="section">
            <h3>Work Environment</h3>
            <p>${careerData.workEnvironment}</p>
          </div>
        ` : ''}
        
        ${careerData.relatedCareers && careerData.relatedCareers.length > 0 ? `
          <div class="section">
            <h3>Related Careers</h3>
            <div class="related-careers">
              ${careerData.relatedCareers.map(related => `<span class="related-career">${related}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      ` : `
        <div class="no-details">
          <p>Detailed information for this career is not available yet.</p>
          <p>This career was loaded from a basic list. Enhanced details will be available when more comprehensive data is generated.</p>
        </div>
      `}
    </div>
  `;
  
  // Show the details section
  detailsSection.classList.remove('hidden');
  detailsSection.style.display = 'block';
  
  // Smooth scroll to top of details
  detailsSection.scrollTop = 0;
  setTimeout(() => {
    detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function generateEducationPathwaysHTML(pathways) {
  let html = '';
  
  if (Array.isArray(pathways)) {
    // New format with array of pathway objects
    html = pathways.map(pathway => `
      <div class="pathway-card ${pathway.difficulty || 'medium'}">
        <div class="pathway-header">
          <h4>${pathway.route}</h4>
          <span class="pathway-difficulty ${pathway.difficulty || 'medium'}">${(pathway.difficulty || 'medium').toUpperCase()}</span>
        </div>
        <p class="pathway-description">${pathway.description}</p>
        <div class="pathway-details">
          <div class="pathway-duration">
            <strong>Duration:</strong> ${pathway.duration}
          </div>
          ${pathway.requirements ? `
            <div class="pathway-requirements">
              <strong>Requirements:</strong>
              <ul>
                ${pathway.requirements.map(req => `<li>${req}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${pathway.alternativePaths && pathway.alternativePaths.length > 0 ? `
            <div class="pathway-alternatives">
              <strong>Alternative Paths:</strong>
              <ul>
                ${pathway.alternativePaths.map(alt => `<li>${alt}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  } else {
    // Old format with pathway types
    if (pathways.formal) {
      html += `
        <div class="pathway">
          <h4>🎓 Formal Education <span class="difficulty ${pathways.formal.difficulty.toLowerCase()}">${pathways.formal.difficulty}</span></h4>
          <p><strong>Level:</strong> ${pathways.formal.level}</p>
          <p>${pathways.formal.description}</p>
        </div>`;
    }
    
    if (pathways.certificate) {
      html += `
        <div class="pathway">
          <h4>📜 Certificate/Bootcamp <span class="difficulty ${pathways.certificate.difficulty.toLowerCase()}">${pathways.certificate.difficulty}</span></h4>
          <p><strong>Level:</strong> ${pathways.certificate.level}</p>
          <p>${pathways.certificate.description}</p>
        </div>`;
    }
    
    if (pathways.selfTaught) {
      html += `
        <div class="pathway">
          <h4>💻 Self-Taught <span class="difficulty ${pathways.selfTaught.difficulty.toLowerCase()}">${pathways.selfTaught.difficulty}</span></h4>
          <p><strong>Level:</strong> ${pathways.selfTaught.level}</p>
          <p>${pathways.selfTaught.description}</p>
        </div>`;
    }
    
    if (pathways.alternative) {
      html += `
        <div class="pathway">
          <h4>🛤️ Alternative Path <span class="difficulty ${pathways.alternative.difficulty.toLowerCase()}">${pathways.alternative.difficulty}</span></h4>
          <p><strong>Level:</strong> ${pathways.alternative.level}</p>
          <p>${pathways.alternative.description}</p>
        </div>`;
    }
  }
  
  return html;
}

// Dark mode functionality
function initDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const body = document.body;
  
  // Check for saved dark mode preference
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️ Light Mode';
  }
  
  darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isNowDark = body.classList.contains('dark-mode');
    
    // Save preference
    localStorage.setItem('darkMode', isNowDark);
    
    // Update button text
    darkModeToggle.textContent = isNowDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  });
}

// Scroll to top functionality
function initScrollToTop() {
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  
  // Show/hide button based on scroll position
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.style.display = 'block';
    } else {
      scrollToTopBtn.style.display = 'none';
    }
  });
  
  // Scroll to top when button is clicked
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // For faster animation (100ms), we can use a custom animation
    const startTime = performance.now();
    const startPosition = window.pageYOffset;
    const duration = 100; // 100ms as requested
    
    function animateScroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeInOutQuad = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      window.scrollTo(0, startPosition * (1 - easeInOutQuad));
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    }
    
    requestAnimationFrame(animateScroll);
  });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeDisclaimerModal();
  initDarkMode();
  initScrollToTop();
});

loadCareers();

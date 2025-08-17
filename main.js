const axios = require('axios');
const cheerio = require('cheerio');
const XLSX = require('xlsx');
const fs = require('fs');

// Function to fetch and parse a page
async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    return cheerio.load(response.data);
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return null;
  }
}

// Function to extract shop links from a list page
function extractShopLinks($) {
  const links = new Set(); // Use Set to avoid duplicates
  $('a[href^="/Shop/"]').each((i, el) => {
    const relativeLink = $(el).attr('href');
    if (relativeLink) {
      links.add(`https://emalls.ir${relativeLink}`);
    }
  });
  return Array.from(links);
}

// Function to extract shop details from a shop page
async function extractShopDetails(shopUrl) {
  const $ = await fetchPage(shopUrl);
  if (!$) return null;

  const shop = {};

  // Shop Name: From h1 or title
  shop.name = $('h1').text().trim() || $('title').text().split('|')[0].trim() || 'N/A';

  // Address: From class shop-address
  shop.address = $('.shop-address').text().trim() || 'N/A';

  // Phone Number: Look for tel links
  shop.phone = $('a[href^="tel:"]').attr('href')?.replace('tel:', '').trim() || 'N/A';

  // Website: From class ex-link-icon link-website
  shop.website = $('.ex-link-icon.link-website').attr('href')?.trim() || 'N/A';

  // WhatsApp: Look for whatsapp links
  shop.whatsapp = $('a[href^="https://wa.me/"], a[href^="whatsapp://"]').attr('href')?.trim() || 'N/A';

  // City: From class shop-location
  shop.city = $('.shop-location').text().trim() || 'N/A';

  // Responsible Person: From span with id ContentPlaceHolder1_lblMasool1
  shop.responsible = $('#ContentPlaceHolder1_lblMasool1').text().trim() || 'N/A';

  console.log(shop);
  

  return shop;
}

// Function to save data to Excel
function saveToExcel(data, page) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Shops_Page_${page}`);
  XLSX.writeFile(workbook, `shops_page_${page}.xlsx`);
}

// Main scraper function
async function scrapeShops() {
  const baseUrl = 'https://emalls.ir/Shops/';
  const totalPages = 1123; // From pagination info

  for (let page = 415; page <= 499; page++) {
    const pageData = [];
    const pageUrl = page === 1 ? baseUrl : `${baseUrl}page.${page}/`;
    console.log(`Scraping page ${page}: ${pageUrl}`);

    const $ = await fetchPage(pageUrl);
    if (!$) continue;

    const shopLinks = extractShopLinks($);
    for (const link of shopLinks) {
      console.log(`Scraping shop: ${link}`);
      const shopDetails = await extractShopDetails(link);
      if (shopDetails) {
        pageData.push(shopDetails);
      }
      // Delay to avoid rate limiting (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save data for this page to Excel
    if (pageData.length > 0) {
      saveToExcel(pageData, page);
      console.log(`Saved page ${page} to shops_page_${page}.xlsx`);
    } else {
      console.log(`No data found for page ${page}`);
    }
  }

  console.log('Scraping completed.');
}

// Run the scraper
scrapeShops().catch(console.error);
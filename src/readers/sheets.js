/**
 * Google Sheets reader.
 *
 * Connects to your content calendar spreadsheet and pulls rows
 * that are scheduled for today (or a given date) and haven't been drafted yet.
 *
 * Expected sheet columns:
 *   Date | Brand | Platform | Topic | Notes | Status
 *
 * - Date: YYYY-MM-DD format
 * - Brand: one of "btbp", "personal", "personal_life", "ai_maxxing"
 * - Platform: "linkedin", "x", "substack", "tiktok", "instagram"
 * - Topic: what the post is about
 * - Notes: any additional context, links, or angles you want Claude to use
 * - Status: "todo", "drafted", "posted" — we only pull "todo" rows
 */

import { google } from "googleapis";

/**
 * Creates an authenticated Google Sheets client using service account credentials.
 */
function createSheetsClient(credentials) {
  const auth = new google.auth.JWT(
    credentials.clientEmail,
    null,
    credentials.privateKey,
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );

  return google.sheets({ version: "v4", auth });
}

/**
 * Pulls content calendar entries for a specific date.
 *
 * @param {Object} options
 * @param {string} options.sheetId - Google Sheet ID
 * @param {string} options.tabName - Tab/sheet name (e.g. "Content Calendar")
 * @param {string} options.date - Date to pull entries for (YYYY-MM-DD)
 * @param {Object} options.credentials - { clientEmail, privateKey }
 * @returns {Array<Object>} Array of content items to draft
 */
export async function getContentForDate({ sheetId, tabName, date, credentials }) {
  const sheets = createSheetsClient(credentials);

  // Pull all rows from the sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A:F`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    console.log("No data found in sheet.");
    return [];
  }

  // First row is headers, rest is data
  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  // Map rows to objects using headers
  const entries = dataRows.map((row) => {
    const entry = {};
    headers.forEach((header, i) => {
      entry[header] = row[i] || "";
    });
    return entry;
  });

  // Filter: match the target date AND status is "todo"
  const todayEntries = entries.filter((entry) => {
    return entry.date === date && entry.status.toLowerCase() === "todo";
  });

  console.log(
    `Found ${todayEntries.length} entries for ${date} with status "todo"`
  );

  return todayEntries;
}

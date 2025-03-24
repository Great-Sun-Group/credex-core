#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// The AccountInternal schema to add to dashboard definitions
const accountsInternalSchema = `
 *                         accountsInternal:
 *                           type: array
 *                           description: List of internal accounts owned by the member
 *                           items:
 *                             type: object
 *                             properties:
 *                               accountID:
 *                                 type: string
 *                                 format: uuid
 *                                 description: Unique identifier for the internal account
 *                               accountName:
 *                                 type: string
 *                                 description: Name of the internal account
 *                               accountType:
 *                                 type: string
 *                                 enum: [CONSUMPTION, PRODUCTION, DIGITAL_ASSET, PHYSICAL_ASSET]
 *                                 description: Type of the internal account`;

// Find all Route files that contain dashboard definitions in Swagger
function findFilesWithDashboard(rootDir) {
  try {
    // Use grep to find Route files containing dashboard definitions in Swagger
    const grepCommand = `grep -r " \\*                     dashboard:" --include="*Route.ts" ${rootDir}`;
    const result = execSync(grepCommand, { encoding: 'utf8' });
    
    // Parse the grep output to get file paths
    const files = result.split('\n')
      .filter(line => line.includes('dashboard:'))
      .map(line => {
        const colonIndex = line.indexOf(':');
        return line.substring(0, colonIndex);
      })
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    
    return files;
  } catch (error) {
    console.error('Error finding files:', error.message);
    return [];
  }
}

// Update a file to add AccountInternal schema to dashboard definition
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file already has accountsInternal
    if (content.includes('accountsInternal:')) {
      console.log(`File ${filePath} already has accountsInternal schema`);
      return;
    }
    
    // Find the dashboard section with accounts
    const dashboardAccountsRegex = / \*                     dashboard:[\s\S]*? \*                         accounts:/g;
    const matches = [...content.matchAll(dashboardAccountsRegex)];
    
    if (matches.length === 0) {
      // Try a different pattern
      const dashboardRegex = / \*                     dashboard:[\s\S]*? \*                         defaultDenom:/g;
      const dashboardMatches = [...content.matchAll(dashboardRegex)];
      
      if (dashboardMatches.length === 0) {
        console.log(`No suitable dashboard definition found in ${filePath}`);
        return;
      }
      
      // For each dashboard section, find where to insert accountsInternal
      let updatedContent = content;
      let offset = 0;
      
      for (const match of dashboardMatches) {
        const matchText = match[0];
        const matchStart = match.index + offset;
        
        // Find the end of defaultDenom section
        const defaultDenomEndIndex = matchText.lastIndexOf('defaultDenom:');
        if (defaultDenomEndIndex === -1) {
          continue;
        }
        
        // Find the next property after defaultDenom
        const nextPropertyMatch = matchText.substring(defaultDenomEndIndex).match(/\n \*                         [a-zA-Z]+:/);
        if (!nextPropertyMatch) {
          continue;
        }
        
        const insertPosition = matchStart + defaultDenomEndIndex + nextPropertyMatch.index;
        
        // Insert the accountsInternal schema
        updatedContent = 
          updatedContent.substring(0, insertPosition) + 
          accountsInternalSchema + 
          updatedContent.substring(insertPosition);
        
        // Update offset for subsequent matches
        offset += accountsInternalSchema.length;
      }
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated ${filePath} (using defaultDenom pattern)`);
      return;
    }
    
    // Process each dashboard section with accounts
    let updatedContent = content;
    let offset = 0;
    
    for (const match of matches) {
      const matchStart = match.index + offset;
      const matchEnd = matchStart + match[0].length;
      
      // Insert the accountsInternal schema right before accounts:
      const insertPosition = matchEnd - ' *                         accounts:'.length;
      
      // Insert the accountsInternal schema
      updatedContent = 
        updatedContent.substring(0, insertPosition) + 
        accountsInternalSchema + '\n' + 
        updatedContent.substring(insertPosition);
      
      // Update offset for subsequent matches
      offset += accountsInternalSchema.length + 1; // +1 for the newline
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated ${filePath} (using accounts pattern)`);
  } catch (error) {
    console.error(`Error updating file ${filePath}:`, error.message);
  }
}

// Main function
function main() {
  const rootDir = path.resolve(__dirname, '../src');
  console.log(`Searching for files with dashboard definitions in ${rootDir}...`);
  
  const files = findFilesWithDashboard(rootDir);
  console.log(`Found ${files.length} files with dashboard definitions`);
  
  for (const file of files) {
    updateFile(file);
  }
  
  console.log('Done!');
}

main();

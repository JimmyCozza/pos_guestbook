import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import * as toast from './toast.js';

const POS_SYSTEMS = {
  toast,
};

const SOURCE_DIR = 'files';
const PROCESSED_DIR = 'processed';

//This is a function that can take an array of guest objects and do some kind of upsert or persistence operation of some kind.
//For this demo, let's just write it to a new file and call it good enough.  If it was a db, we'd do an insert or possibly upsert if we care about updating anything related to visit count or such.
//Not sure if we store the customerId or not, but I'm going to assume we do
async function handleGuestRecords(records) {
  const filePath = path.join(__dirname, 'guest_records.json');
  let existingRecords = [];

  try {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      existingRecords = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    const combinedRecords = [...existingRecords];

    for (const newRecord of records) {
      if (newRecord.customerId) {
        // If record has customerId, update existing or add new
        const existingIndex = combinedRecords.findIndex(
          record => record.customerId === newRecord.customerId
        );

        if (existingIndex >= 0) {
          combinedRecords[existingIndex] = newRecord;
        } else {
          combinedRecords.push(newRecord);
        }
      } else {
        combinedRecords.push(newRecord);
      }
    }

    // Write back to file with pretty formatting for readability
    await fs.writeFile(
      filePath,
      JSON.stringify(combinedRecords, null, 2)
    );

    return combinedRecords.length;
  } catch (error) {
    console.error('Error handling guest records:', error);
    throw error;
  }
}

async function processFile(zipPath, pos = 'toast') {
  try {
    if (!POS_SYSTEMS[pos]) {
      throw new Error(`Unsupported POS system: ${pos}`);
    }
    const { columnMapping } = POS_SYSTEMS[pos];

    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    const csvEntry = zipEntries[0];
    const csvContent = csvEntry.getData().toString('utf8');

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    })

    //I'm assuming we only want records with either a phone number or email?
    //What can we do marketing-wise without one of those?
    const validRecords = records.filter(record => record.Phone || (record.Email && record.Email !== '-'));
    const transformedRecords = validRecords.map(record => {
      const transformed = {};
      Object.entries(columnMapping).forEach(([csvHeader, jsonKey]) => {
        transformed[jsonKey] = record[csvHeader];
      });
      return transformed;
    });
    return transformedRecords;

  } catch (error) {
    console.error('Error processing zip file:', error);
    throw error;
  }
}

async function moveToProcessed(zipPath, processedDir) {
  try {
    const basename = path.basename(zipPath);
    const ext = path.extname(basename);
    const nameWithoutExt = basename.slice(0, -ext.length);
    
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')  // Replace : and . with - for filename safety
      .replace('T', '_')      // Replace T with underscore for readability
      .slice(0, -1);          // Remove the trailing Z
    
    const newFilename = `${nameWithoutExt}_${timestamp}${ext}`;
    const newPath = path.join(processedDir, newFilename);
    
    await fs.rename(zipPath, newPath);
    
    console.log(`Moved ${basename} to ${newPath}`);
  } catch (error) {
    console.error(`Error moving processed file: ${error.message}`);
    throw error;
  }
}

async function main(sourceDir, processedDir) {
  try {
    await fs.mkdir(processedDir, { recursive: true });

    const files = await fs.readdir(sourceDir);
    const zipFiles = files.filter(file => file.toLowerCase().endsWith('.zip'));

    if (zipFiles.length === 0) {
      console.log('No zip files found to process');
      return;
    }

    console.log(`Found ${zipFiles.length} zip files to process`);

    const processPromises = zipFiles.map(async (zipFile) => {
      const zipPath = path.join(sourceDir, zipFile);
      console.log('zipPath: ', zipPath);

      try {
        const records = await processFile(zipPath);
        await handleGuestRecords(records);
        await moveToProcessed(zipPath, processedDir);
        console.log(`Successfully processed ${zipFile}`);
      } catch (error) {
        console.error(`Error processing ${zipFile}:`, error);
      }
    });

    await Promise.all(processPromises);

    console.log('Finished processing all zip files');
  } catch (error) {
    console.error('Error in processZipFiles:', error);
    throw error;
  }
}

main(SOURCE_DIR, PROCESSED_DIR);

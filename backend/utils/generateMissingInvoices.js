import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import JobCard from '../models/JobCard.js';
import Invoice from '../models/Invoice.js';
import { autoGenerateInvoice } from '../controllers/billingController.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    console.log('Connected to Database. Checking for completed Job Cards without Invoices...');

    // Find all completed / delivered job cards
    const completedJobCards = await JobCard.find({
      status: { $in: ['Completed', 'Delivered'] }
    });

    console.log(`Found ${completedJobCards.length} completed/delivered job cards.`);

    let generatedCount = 0;
    for (const jc of completedJobCards) {
      const existing = await Invoice.findOne({ jobCard: jc._id });
      if (!existing) {
        console.log(`Generating invoice for Job Card: ${jc.jobNumber}`);
        const inv = await autoGenerateInvoice(jc);
        if (inv) {
          console.log(`Successfully generated Invoice: ${inv.invoiceNumber}`);
          generatedCount++;
        } else {
          console.error(`Failed to generate invoice for Job Card: ${jc.jobNumber}`);
        }
      } else {
        console.log(`Invoice already exists for Job Card ${jc.jobNumber}: ${existing.invoiceNumber}`);
      }
    }

    console.log(`Invoice generation complete. Generated ${generatedCount} invoices.`);
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
};

run();

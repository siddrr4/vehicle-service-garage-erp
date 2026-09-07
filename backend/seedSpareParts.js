import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import SparePart from './models/SparePart.js';

dotenv.config();

const partsList = [
  // 1. Engine Parts
  {
    partName: 'Timing Belt',
    category: 'Engine Parts',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Hyundai', 'Honda'],
    manufacturer: 'Continental',
    unitPrice: 1200,
    sellingPrice: 2200,
    quantityAvailable: 15,
    minimumStockLevel: 5,
    rackLocation: 'Rack A-01',
    supplier: 'Metro Auto Spares',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Timing Chain',
    category: 'Engine Parts',
    compatibleVehicleBrands: ['Tata', 'Mahindra', 'Hyundai'],
    manufacturer: 'Rolon',
    unitPrice: 2500,
    sellingPrice: 4200,
    quantityAvailable: 10,
    minimumStockLevel: 3,
    rackLocation: 'Rack A-02',
    supplier: 'Metro Auto Spares',
    warranty: '2 Years',
    gstPercent: 18
  },
  {
    partName: 'Piston Ring',
    category: 'Engine Parts',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Tata', 'Hyundai'],
    manufacturer: 'Goetze',
    unitPrice: 800,
    sellingPrice: 1400,
    quantityAvailable: 20,
    minimumStockLevel: 5,
    rackLocation: 'Rack A-03',
    supplier: 'Sanjay Pistons Ltd',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Cylinder Head Gasket',
    category: 'Engine Parts',
    compatibleVehicleBrands: ['Toyota', 'Honda', 'Hyundai', 'Maruti Suzuki'],
    manufacturer: 'Victor Reinz',
    unitPrice: 1500,
    sellingPrice: 2800,
    quantityAvailable: 12,
    minimumStockLevel: 4,
    rackLocation: 'Rack A-04',
    supplier: 'Apex Auto Components',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Spark Plug',
    category: 'Engine Parts',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Honda', 'Hyundai', 'Ford'],
    manufacturer: 'NGK Iridium',
    unitPrice: 250,
    sellingPrice: 450,
    quantityAvailable: 50,
    minimumStockLevel: 10,
    rackLocation: 'Rack A-05',
    supplier: 'Apex Auto Components',
    warranty: '6 Months',
    gstPercent: 18
  },

  // 2. Brake System
  {
    partName: 'Front Brake Pad',
    category: 'Brake System',
    compatibleVehicleBrands: ['Hyundai', 'Maruti Suzuki', 'Kia', 'Toyota'],
    manufacturer: 'Bosch',
    unitPrice: 900,
    sellingPrice: 1800,
    quantityAvailable: 25,
    minimumStockLevel: 8,
    rackLocation: 'Rack B-01',
    supplier: 'Universal Brake Linings',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Rear Brake Pad',
    category: 'Brake System',
    compatibleVehicleBrands: ['Hyundai', 'Honda', 'Toyota', 'Mahindra'],
    manufacturer: 'Bosch',
    unitPrice: 800,
    sellingPrice: 1600,
    quantityAvailable: 4, // Low Stock
    minimumStockLevel: 8,
    rackLocation: 'Rack B-02',
    supplier: 'Universal Brake Linings',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Brake Disc',
    category: 'Brake System',
    compatibleVehicleBrands: ['Toyota', 'Honda', 'Hyundai', 'Chevrolet'],
    manufacturer: 'Brembo',
    unitPrice: 1800,
    sellingPrice: 3200,
    quantityAvailable: 12,
    minimumStockLevel: 4,
    rackLocation: 'Rack B-03',
    supplier: 'Metro Auto Spares',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Brake Drum',
    category: 'Brake System',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Tata', 'Hyundai'],
    manufacturer: 'TVS',
    unitPrice: 1200,
    sellingPrice: 2100,
    quantityAvailable: 10,
    minimumStockLevel: 3,
    rackLocation: 'Rack B-04',
    supplier: 'Universal Brake Linings',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Brake Caliper',
    category: 'Brake System',
    compatibleVehicleBrands: ['Hyundai', 'Honda', 'Toyota'],
    manufacturer: 'KBX',
    unitPrice: 2800,
    sellingPrice: 4900,
    quantityAvailable: 0, // Out of Stock
    minimumStockLevel: 2,
    rackLocation: 'Rack B-05',
    supplier: 'Metro Auto Spares',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Brake Hose',
    category: 'Brake System',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Ford', 'Tata'],
    manufacturer: 'TVS Girling',
    unitPrice: 300,
    sellingPrice: 550,
    quantityAvailable: 15,
    minimumStockLevel: 5,
    rackLocation: 'Rack B-06',
    supplier: 'Universal Brake Linings',
    warranty: '6 Months',
    gstPercent: 18
  },

  // 3. Suspension
  {
    partName: 'Front Shock Absorber',
    category: 'Suspension',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Honda', 'Hyundai', 'Kia'],
    manufacturer: 'Monroe',
    unitPrice: 2200,
    sellingPrice: 3800,
    quantityAvailable: 14,
    minimumStockLevel: 4,
    rackLocation: 'Rack C-01',
    supplier: 'Apex Auto Components',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Rear Shock Absorber',
    category: 'Suspension',
    compatibleVehicleBrands: ['Tata', 'Mahindra', 'Maruti Suzuki', 'Hyundai'],
    manufacturer: 'Gabriel',
    unitPrice: 1900,
    sellingPrice: 3400,
    quantityAvailable: 16,
    minimumStockLevel: 4,
    rackLocation: 'Rack C-02',
    supplier: 'Apex Auto Components',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Coil Spring',
    category: 'Suspension',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Hyundai', 'Honda'],
    manufacturer: 'Gabriel',
    unitPrice: 1100,
    sellingPrice: 1950,
    quantityAvailable: 8,
    minimumStockLevel: 3,
    rackLocation: 'Rack C-03',
    supplier: 'Apex Auto Components',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Control Arm',
    category: 'Suspension',
    compatibleVehicleBrands: ['Honda', 'Toyota', 'Volkswagen', 'Skoda'],
    manufacturer: 'Talbros',
    unitPrice: 2400,
    sellingPrice: 4100,
    quantityAvailable: 6,
    minimumStockLevel: 2,
    rackLocation: 'Rack C-04',
    supplier: 'Metro Auto Spares',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Ball Joint',
    category: 'Suspension',
    compatibleVehicleBrands: ['Mahindra', 'Tata', 'Toyota', 'Ford'],
    manufacturer: 'Talbros',
    unitPrice: 450,
    sellingPrice: 800,
    quantityAvailable: 22,
    minimumStockLevel: 6,
    rackLocation: 'Rack C-05',
    supplier: 'Metro Auto Spares',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Tie Rod End',
    category: 'Suspension',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Hyundai', 'Tata', 'Toyota'],
    manufacturer: 'Rane',
    unitPrice: 550,
    sellingPrice: 950,
    quantityAvailable: 18,
    minimumStockLevel: 5,
    rackLocation: 'Rack C-06',
    supplier: 'Apex Auto Components',
    warranty: '6 Months',
    gstPercent: 18
  },

  // 4. Electrical
  {
    partName: 'Alternator',
    category: 'Electrical',
    compatibleVehicleBrands: ['Tata', 'Maruti Suzuki', 'Hyundai', 'Mahindra'],
    manufacturer: 'Lucas-TVS',
    unitPrice: 4500,
    sellingPrice: 7800,
    quantityAvailable: 5,
    minimumStockLevel: 2,
    rackLocation: 'Rack D-01',
    supplier: 'Premier Electrics',
    warranty: '1.5 Years',
    gstPercent: 18
  },
  {
    partName: 'Starter Motor',
    category: 'Electrical',
    compatibleVehicleBrands: ['Mahindra', 'Maruti Suzuki', 'Hyundai', 'Toyota'],
    manufacturer: 'Lucas-TVS',
    unitPrice: 3800,
    sellingPrice: 6500,
    quantityAvailable: 0, // Out of Stock
    minimumStockLevel: 2,
    rackLocation: 'Rack D-02',
    supplier: 'Premier Electrics',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Ignition Coil',
    category: 'Electrical',
    compatibleVehicleBrands: ['Hyundai', 'Honda', 'Volkswagen', 'Ford'],
    manufacturer: 'Bosch',
    unitPrice: 1200,
    sellingPrice: 2100,
    quantityAvailable: 12,
    minimumStockLevel: 4,
    rackLocation: 'Rack D-03',
    supplier: 'Premier Electrics',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Headlight Bulb',
    category: 'Electrical',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Philips H7',
    unitPrice: 200,
    sellingPrice: 380,
    quantityAvailable: 60,
    minimumStockLevel: 15,
    rackLocation: 'Rack D-04',
    supplier: 'Premier Electrics',
    warranty: '3 Months',
    gstPercent: 18
  },
  {
    partName: 'Tail Light Bulb',
    category: 'Electrical',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Osram',
    unitPrice: 100,
    sellingPrice: 180,
    quantityAvailable: 80,
    minimumStockLevel: 15,
    rackLocation: 'Rack D-05',
    supplier: 'Premier Electrics',
    warranty: '3 Months',
    gstPercent: 18
  },
  {
    partName: 'Horn',
    category: 'Electrical',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Bosch Symphony',
    unitPrice: 600,
    sellingPrice: 1100,
    quantityAvailable: 15,
    minimumStockLevel: 4,
    rackLocation: 'Rack D-06',
    supplier: 'Apex Auto Components',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Fuse Kit',
    category: 'Electrical',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Hella',
    unitPrice: 150,
    sellingPrice: 280,
    quantityAvailable: 40,
    minimumStockLevel: 10,
    rackLocation: 'Rack D-07',
    supplier: 'Premier Electrics',
    warranty: 'No Warranty',
    gstPercent: 18
  },

  // 5. Filters
  {
    partName: 'Oil Filter',
    category: 'Filters',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Hyundai', 'Honda', 'Toyota', 'Tata'],
    manufacturer: 'Purolator',
    unitPrice: 180,
    sellingPrice: 320,
    quantityAvailable: 100,
    minimumStockLevel: 20,
    rackLocation: 'Rack E-01',
    supplier: 'Metro Auto Spares',
    warranty: 'No Warranty',
    gstPercent: 18
  },
  {
    partName: 'Air Filter',
    category: 'Filters',
    compatibleVehicleBrands: ['Toyota', 'Honda', 'Hyundai', 'Maruti Suzuki', 'Tata'],
    manufacturer: 'Bosch',
    unitPrice: 250,
    sellingPrice: 450,
    quantityAvailable: 60,
    minimumStockLevel: 15,
    rackLocation: 'Rack E-02',
    supplier: 'Metro Auto Spares',
    warranty: 'No Warranty',
    gstPercent: 18
  },
  {
    partName: 'Fuel Filter',
    category: 'Filters',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Tata', 'Hyundai', 'Ford'],
    manufacturer: 'Purolator',
    unitPrice: 350,
    sellingPrice: 600,
    quantityAvailable: 30,
    minimumStockLevel: 10,
    rackLocation: 'Rack E-03',
    supplier: 'Metro Auto Spares',
    warranty: 'No Warranty',
    gstPercent: 18
  },

  // 6. Oils & Lubricants
  {
    partName: 'Engine Oil 5W30',
    category: 'Oils & Lubricants',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Hyundai', 'Honda', 'Toyota'],
    manufacturer: 'Castrol MAGNATEC 4L',
    unitPrice: 1600,
    sellingPrice: 2400,
    quantityAvailable: 24,
    minimumStockLevel: 6,
    rackLocation: 'Rack F-01',
    supplier: 'Rohan Lubes & Co',
    warranty: '3 Years (Shelf Life)',
    gstPercent: 18
  },
  {
    partName: 'Engine Oil 10W40',
    category: 'Oils & Lubricants',
    compatibleVehicleBrands: ['Mahindra', 'Tata', 'Force', 'Hyundai'],
    manufacturer: 'Mobil Super 4L',
    unitPrice: 1400,
    sellingPrice: 2100,
    quantityAvailable: 3, // Low Stock
    minimumStockLevel: 6,
    rackLocation: 'Rack F-02',
    supplier: 'Rohan Lubes & Co',
    warranty: '3 Years (Shelf Life)',
    gstPercent: 18
  },
  {
    partName: 'Gear Oil',
    category: 'Oils & Lubricants',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Shell Spirax 1L',
    unitPrice: 350,
    sellingPrice: 550,
    quantityAvailable: 35,
    minimumStockLevel: 8,
    rackLocation: 'Rack F-03',
    supplier: 'Rohan Lubes & Co',
    warranty: '5 Years (Shelf Life)',
    gstPercent: 18
  },
  {
    partName: 'Brake Fluid DOT 4',
    category: 'Oils & Lubricants',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Castrol 250ml',
    unitPrice: 120,
    sellingPrice: 200,
    quantityAvailable: 40,
    minimumStockLevel: 10,
    rackLocation: 'Rack F-04',
    supplier: 'Rohan Lubes & Co',
    warranty: '2 Years (Shelf Life)',
    gstPercent: 18
  },

  // 7. Battery
  {
    partName: 'Car Battery 12V',
    category: 'Battery',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Hyundai', 'Honda', 'Tata', 'Mahindra'],
    manufacturer: 'Exide Milega',
    unitPrice: 3800,
    sellingPrice: 5500,
    quantityAvailable: 8,
    minimumStockLevel: 3,
    rackLocation: 'Rack G-01',
    supplier: 'Apex Auto Components',
    warranty: '3 Years',
    gstPercent: 28 // Batteries are generally 28% GST in India
  },

  // 8. Tyres & Wheels
  {
    partName: 'Front Tyre',
    category: 'Tyres & Wheels',
    compatibleVehicleBrands: ['Maruti Suzuki Swift', 'Maruti Suzuki Dzire', 'Hyundai Grand i10'],
    manufacturer: 'MRF ZVTV 165/80 R14',
    unitPrice: 2800,
    sellingPrice: 4100,
    quantityAvailable: 12,
    minimumStockLevel: 4,
    rackLocation: 'Tyre Stack A',
    supplier: 'Dynamic Rubber Sales',
    warranty: '5 Years',
    gstPercent: 28
  },
  {
    partName: 'Rear Tyre',
    category: 'Tyres & Wheels',
    compatibleVehicleBrands: ['Hyundai i20', 'Maruti Baleno', 'Honda Amaze'],
    manufacturer: 'Apollo Alnac 4G 185/65 R15',
    unitPrice: 3200,
    sellingPrice: 4800,
    quantityAvailable: 10,
    minimumStockLevel: 4,
    rackLocation: 'Tyre Stack B',
    supplier: 'Dynamic Rubber Sales',
    warranty: '5 Years',
    gstPercent: 28
  },
  {
    partName: 'Alloy Wheel',
    category: 'Tyres & Wheels',
    compatibleVehicleBrands: ['Honda Civic', 'Hyundai Creta', 'Maruti Brezza'],
    manufacturer: 'Neo Wheels 15"',
    unitPrice: 4500,
    sellingPrice: 6500,
    quantityAvailable: 4,
    minimumStockLevel: 2,
    rackLocation: 'Rack H-01',
    supplier: 'Metro Auto Spares',
    warranty: '2 Years',
    gstPercent: 28
  },
  {
    partName: 'Wheel Bearing',
    category: 'Tyres & Wheels',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Tata', 'Hyundai', 'Ford'],
    manufacturer: 'SKF',
    unitPrice: 600,
    sellingPrice: 1100,
    quantityAvailable: 20,
    minimumStockLevel: 5,
    rackLocation: 'Rack H-02',
    supplier: 'Apex Auto Components',
    warranty: '1 Year',
    gstPercent: 18
  },

  // 9. Cooling System
  {
    partName: 'Radiator',
    category: 'Cooling System',
    compatibleVehicleBrands: ['Hyundai i10/i20', 'Maruti WagonR/Swift'],
    manufacturer: 'Banco',
    unitPrice: 2800,
    sellingPrice: 4500,
    quantityAvailable: 6,
    minimumStockLevel: 2,
    rackLocation: 'Rack I-01',
    supplier: 'Cool Solutions Distributors',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Radiator Fan',
    category: 'Cooling System',
    compatibleVehicleBrands: ['Honda City', 'Toyota Corolla', 'Hyundai Verna'],
    manufacturer: 'Valeo',
    unitPrice: 1400,
    sellingPrice: 2400,
    quantityAvailable: 8,
    minimumStockLevel: 3,
    rackLocation: 'Rack I-02',
    supplier: 'Cool Solutions Distributors',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Water Pump',
    category: 'Cooling System',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Tata', 'Mahindra', 'Force'],
    manufacturer: 'TVS',
    unitPrice: 1200,
    sellingPrice: 2100,
    quantityAvailable: 10,
    minimumStockLevel: 3,
    rackLocation: 'Rack I-03',
    supplier: 'Metro Auto Spares',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Coolant',
    category: 'Cooling System',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Castrol Radicool 1L',
    unitPrice: 220,
    sellingPrice: 380,
    quantityAvailable: 50,
    minimumStockLevel: 12,
    rackLocation: 'Rack F-05',
    supplier: 'Rohan Lubes & Co',
    warranty: 'No Warranty',
    gstPercent: 18
  },
  {
    partName: 'Thermostat Valve',
    category: 'Cooling System',
    compatibleVehicleBrands: ['Hyundai', 'Honda', 'Maruti Suzuki', 'Toyota'],
    manufacturer: 'Mahle',
    unitPrice: 450,
    sellingPrice: 800,
    quantityAvailable: 15,
    minimumStockLevel: 4,
    rackLocation: 'Rack I-04',
    supplier: 'Cool Solutions Distributors',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Radiator Hose',
    category: 'Cooling System',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Tata', 'Hyundai', 'Ford'],
    manufacturer: 'Gates',
    unitPrice: 250,
    sellingPrice: 450,
    quantityAvailable: 18,
    minimumStockLevel: 5,
    rackLocation: 'Rack I-05',
    supplier: 'Cool Solutions Distributors',
    warranty: '6 Months',
    gstPercent: 18
  },

  // 10. Transmission
  {
    partName: 'Clutch Plate',
    category: 'Transmission',
    compatibleVehicleBrands: ['Maruti Suzuki Swift/Baleno', 'Hyundai i20/Verna'],
    manufacturer: 'Valeo',
    unitPrice: 1800,
    sellingPrice: 3100,
    quantityAvailable: 8,
    minimumStockLevel: 3,
    rackLocation: 'Rack J-01',
    supplier: 'Transmission Torque Ltd',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Pressure Plate',
    category: 'Transmission',
    compatibleVehicleBrands: ['Maruti Suzuki Swift/Baleno', 'Hyundai i20/Verna'],
    manufacturer: 'Ceekay',
    unitPrice: 1500,
    sellingPrice: 2600,
    quantityAvailable: 7,
    minimumStockLevel: 3,
    rackLocation: 'Rack J-02',
    supplier: 'Transmission Torque Ltd',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Release Bearing',
    category: 'Transmission',
    compatibleVehicleBrands: ['Maruti Suzuki', 'Tata', 'Hyundai', 'Honda'],
    manufacturer: 'SKF',
    unitPrice: 400,
    sellingPrice: 750,
    quantityAvailable: 12,
    minimumStockLevel: 4,
    rackLocation: 'Rack J-03',
    supplier: 'Transmission Torque Ltd',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'CV Joint',
    category: 'Transmission',
    compatibleVehicleBrands: ['Honda City/Civic', 'Hyundai Creta/Verna', 'Toyota Corolla'],
    manufacturer: 'GSP',
    unitPrice: 1600,
    sellingPrice: 2800,
    quantityAvailable: 10,
    minimumStockLevel: 3,
    rackLocation: 'Rack J-04',
    supplier: 'Transmission Torque Ltd',
    warranty: '1 Year',
    gstPercent: 18
  },

  // 11. Accessories
  {
    partName: 'Windshield Wiper',
    category: 'Accessories',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Bosch Eco',
    unitPrice: 250,
    sellingPrice: 450,
    quantityAvailable: 30,
    minimumStockLevel: 8,
    rackLocation: 'Rack K-01',
    supplier: 'Apex Auto Components',
    warranty: '3 Months',
    gstPercent: 18
  },
  {
    partName: 'Side Mirror',
    category: 'Accessories',
    compatibleVehicleBrands: ['Maruti Suzuki Swift'],
    manufacturer: 'Uno Minda',
    unitPrice: 600,
    sellingPrice: 1100,
    quantityAvailable: 12,
    minimumStockLevel: 4,
    rackLocation: 'Rack K-02',
    supplier: 'Metro Auto Spares',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Door Handle',
    category: 'Accessories',
    compatibleVehicleBrands: ['Hyundai Santro', 'Hyundai Grand i10'],
    manufacturer: 'Uno Minda',
    unitPrice: 180,
    sellingPrice: 320,
    quantityAvailable: 20,
    minimumStockLevel: 5,
    rackLocation: 'Rack K-03',
    supplier: 'Metro Auto Spares',
    warranty: '6 Months',
    gstPercent: 18
  },
  {
    partName: 'Seat Cover',
    category: 'Accessories',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: 'Elegant',
    unitPrice: 2500,
    sellingPrice: 4500,
    quantityAvailable: 5,
    minimumStockLevel: 2,
    rackLocation: 'Accessories Room 1',
    supplier: 'Metro Auto Spares',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Floor Mat',
    category: 'Accessories',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: '3D Maxpider',
    unitPrice: 1200,
    sellingPrice: 2200,
    quantityAvailable: 8,
    minimumStockLevel: 3,
    rackLocation: 'Accessories Room 2',
    supplier: 'Metro Auto Spares',
    warranty: '1 Year',
    gstPercent: 18
  },
  {
    partName: 'Car Shampoo',
    category: 'Accessories',
    compatibleVehicleBrands: ['Universal'],
    manufacturer: '3M 1L',
    unitPrice: 180,
    sellingPrice: 300,
    quantityAvailable: 40,
    minimumStockLevel: 10,
    rackLocation: 'Accessories Room 3',
    supplier: 'Apex Auto Components',
    warranty: 'No Warranty',
    gstPercent: 18
  }
];

const seedParts = async () => {
  try {
    await connectDB();

    console.log('Clearing existing spare parts...');
    await SparePart.deleteMany({});

    console.log('Inserting spare parts...');
    for (const part of partsList) {
      await SparePart.create(part);
    }

    console.log('Spare parts seeded successfully! Total items: ' + partsList.length);
    process.exit();
  } catch (error) {
    console.error('Error during spare parts seeding:', error);
    process.exit(1);
  }
};

seedParts();

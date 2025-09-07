const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
let db;

function initializeDatabaseConnection() {
  return new Promise((resolve, reject) => {
    const dataDir = path.join(__dirname, 'data');
    const dbPath = path.join(dataDir, 'emissions.db');
    
    console.log('Setting up data directory...');
    console.log(`Data folder: ${dataDir}`);
    console.log(`Database path: ${dbPath}`);
    
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created data directory successfully');
      } catch (error) {
    console.error(' Failed to create data directory:', error);
        const fallbackPath = path.join(__dirname, 'emissions.db');
        
        db = new sqlite3.Database(fallbackPath, (err) => {
          if (err) {
            reject(err);
          } else {
        console.log('Connected to SQLite database: emissions.db (project root)');
            resolve();
          }
        });
        return;
      }
    }
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
    console.error(' Error opening database:', err.message);
        const fallbackPath = path.join(__dirname, 'emissions.db');
        db = new sqlite3.Database(fallbackPath, (fallbackErr) => {
          if (fallbackErr) {
            reject(fallbackErr);
          } else {
        console.log('Connected to SQLite database: emissions.db (project root)');
            resolve();
          }
        });
      } else {
        console.log('Connected to SQLite database in data folder');
        resolve();
      }
    });
  });
}

function createTables() {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS EmissionFactors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          activity_name TEXT NOT NULL,
          unit TEXT NOT NULL,
          co2e_factor REAL NOT NULL,
          scope INTEGER NOT NULL,
          source TEXT NOT NULL,
          valid_from DATE NOT NULL,
          valid_to DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS EmissionRecords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          activity_date DATE NOT NULL,
          activity_name TEXT NOT NULL,
          activity_data REAL NOT NULL,
          unit TEXT NOT NULL,
          emission_factor_id INTEGER,
          calculated_co2e REAL NOT NULL,
          scope INTEGER NOT NULL,
          is_override BOOLEAN DEFAULT 0,
          override_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (emission_factor_id) REFERENCES EmissionFactors(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS AuditLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          record_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          old_value REAL,
          new_value REAL,
          reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (record_id) REFERENCES EmissionRecords(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS BusinessMetrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          metric_name TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      resolve();
    });
  });
}

function checkExistingData() {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM EmissionRecords', (err, result) => {
      if (err) {
        resolve({ records: 0, years: [] });
        return;
      }
      
      if (result.count === 0) {
        resolve({ records: 0, years: [] });
        return;
      }
      
      db.all(`SELECT DISTINCT strftime('%Y', activity_date) as year FROM EmissionRecords ORDER BY year`, (err, yearResults) => {
        if (err) {
          resolve({ records: result.count, years: [] });
        } else {
          const years = yearResults.map(r => r.year);
          resolve({ records: result.count, years });
        }
      });
    });
  });
}

async function initializeDatabase() {
  return new Promise(async (resolve, reject) => {
        console.log('Initializing GHG Emissions Platform...');
    
    try {
      await initializeDatabaseConnection();
    } catch (error) {
    console.error(' Failed to initialize database connection:', error);
      reject(error);
      return;
    }
    
    db.serialize(async () => {
      await createTables();
      
      const existingData = await checkExistingData();
      
      if (existingData.records > 0) {
        console.log('EXISTING DATABASE FOUND');
        console.log(`└─ Records: ${existingData.records}`);
        console.log(`└─ Years: ${existingData.years.join(', ')}`);
        console.log('Using existing database');
        resolve();
        return;
      }
      
        console.log('EMPTY DATABASE - Creating sample data...');
        await createSampleData();
      
      resolve();
    });
  });
}


function insertEmissionFactor(activityName, unit, co2eFactor, scope, source, validFrom, validTo) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO EmissionFactors (activity_name, unit, co2e_factor, scope, source, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(activityName, unit, co2eFactor, scope, source, validFrom, validTo);
  stmt.finalize();
}

function insertEmissionRecord(date, activityName, activityData, unit, calculatedCo2e, scope) {
  const stmt = db.prepare(`
    INSERT INTO EmissionRecords (activity_date, activity_name, activity_data, unit, calculated_co2e, scope)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(date, activityName, activityData, unit, calculatedCo2e, scope);
  stmt.finalize();
}

function addBusinessMetrics() {
  const metrics = [
    ['2024-01-31', 'Tons of Steel Produced', 5000, 'tonnes'],
    ['2024-02-29', 'Tons of Steel Produced', 4800, 'tonnes'],
    ['2024-03-31', 'Tons of Steel Produced', 5200, 'tonnes'],
    ['2024-04-30', 'Tons of Steel Produced', 4900, 'tonnes'],
    ['2024-05-31', 'Tons of Steel Produced', 5100, 'tonnes'],
    ['2024-06-30', 'Tons of Steel Produced', 4850, 'tonnes'],
    ['2024-07-31', 'Tons of Steel Produced', 5300, 'tonnes'],
    ['2024-08-31', 'Tons of Steel Produced', 5000, 'tonnes'],
    ['2024-08-31', 'Employee Count', 920, 'employees']
  ];

  const stmt = db.prepare(`
    INSERT INTO BusinessMetrics (date, metric_name, value, unit)
    VALUES (?, ?, ?, ?)
  `);
  
  metrics.forEach(metric => stmt.run(metric));
  stmt.finalize();
  
  return metrics.length;
}

async function createSampleData() {
        console.log('Creating sample data...');
  
  const basicFactors = [
    ['Diesel', 'KL', 2.539, 1, 'Sample Data', '2024-01-01', '2024-12-31'],
    ['Natural Gas', 'kNm3', 2.425, 1, 'Sample Data', '2024-01-01', '2024-12-31'],
    ['Grid Electricity', 'kWh', 0.8, 2, 'Sample Data', '2024-01-01', '2024-12-31']
  ];

  const factorStmt = db.prepare(`
    INSERT INTO EmissionFactors (activity_name, unit, co2e_factor, scope, source, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  basicFactors.forEach(factor => factorStmt.run(factor));
  factorStmt.finalize();

  const basicRecords = [
    ['2024-01-15', 'Diesel', 100, 'KL', 253900, 1],
    ['2024-01-15', 'Grid Electricity', 10000, 'kWh', 8000, 2]
  ];

  const recordStmt = db.prepare(`
    INSERT INTO EmissionRecords (activity_date, activity_name, activity_data, unit, calculated_co2e, scope)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  basicRecords.forEach(record => recordStmt.run(record));
  recordStmt.finalize();
  
  addBusinessMetrics();
        console.log('Sample data created');
}

function getEmissionFactor(activityName, activityDate, callback) {
  const query = `
    SELECT * FROM EmissionFactors 
    WHERE activity_name = ? 
    AND valid_from <= ? 
    AND (valid_to IS NULL OR valid_to >= ?)
    ORDER BY valid_from DESC 
    LIMIT 1
  `;
  db.get(query, [activityName, activityDate, activityDate], callback);
}

// API Routes
app.get('/api/debug/quick-check', (req, res) => {
  db.get('SELECT COUNT(*) as total FROM EmissionRecords', (err, totalCount) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.all(`SELECT 
              strftime('%Y', activity_date) as year,
              scope,
              COUNT(*) as count,
              SUM(calculated_co2e) as total_emissions
            FROM EmissionRecords 
            GROUP BY year, scope 
            ORDER BY year DESC, scope`, (err, breakdown) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({
        total_records: totalCount.total,
        breakdown_by_year_scope: breakdown,
        current_date: new Date().toISOString(),
        database_seems_healthy: totalCount.total > 0
      });
    });
  });
});

app.get('/api/emission-factors', (req, res) => {
  db.all('SELECT * FROM EmissionFactors ORDER BY activity_name, valid_from DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/emission-records', (req, res) => {
  const { activity_date, activity_name, activity_data, unit, override_co2e, override_reason } = req.body;
  
    console.log(' Adding NEW emission record:', { activity_date, activity_name, activity_data, unit });
  
  getEmissionFactor(activity_name, activity_date, (err, factor) => {
    if (err) {
    console.error(' Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!factor) {
    console.error(' No emission factor found for:', activity_name);
      res.status(400).json({ 
        error: `No emission factor found for "${activity_name}".`
      });
      return;
    }
    
    const calculated_co2e = override_co2e || (activity_data * factor.co2e_factor);
    const is_override = override_co2e ? 1 : 0;
    
    const query = `
      INSERT INTO EmissionRecords 
      (activity_date, activity_name, activity_data, unit, emission_factor_id, calculated_co2e, scope, is_override, override_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
      activity_date, activity_name, activity_data, unit, factor.id, 
      calculated_co2e, factor.scope, is_override, override_reason
    ], function(err) {
      if (err) {
    console.error(' Error inserting record:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      
    console.log(' NEW record created with ID:', this.lastID);
      
      if (is_override) {
        const auditQuery = `
          INSERT INTO AuditLog (record_id, action, old_value, new_value, reason)
          VALUES (?, 'OVERRIDE', ?, ?, ?)
        `;
        
        db.run(auditQuery, [
          this.lastID, activity_data * factor.co2e_factor, override_co2e, override_reason
        ]);
      }
      
      res.json({ 
        id: this.lastID, 
        calculated_co2e, 
        factor_used: factor.co2e_factor,
        is_override: is_override,
        message: 'Record added successfully!'
      });
    });
  });
});

app.get('/api/emission-records', (req, res) => {
  const query = `
    SELECT er.*, ef.activity_name as factor_name, ef.co2e_factor
    FROM EmissionRecords er
    LEFT JOIN EmissionFactors ef ON er.emission_factor_id = ef.id
    ORDER BY er.activity_date DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/analytics/yoy-emissions', (req, res) => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  
  const query = `
    SELECT 
      strftime('%Y', activity_date) as year,
      scope,
      SUM(calculated_co2e) as total_co2e
    FROM EmissionRecords 
    WHERE strftime('%Y', activity_date) IN (?, ?)
    GROUP BY year, scope
    ORDER BY year, scope
  `;
  
  db.all(query, [previousYear.toString(), currentYear.toString()], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      current_year: currentYear,
      previous_year: previousYear,
      data: rows
    });
  });
});

// Debug endpoint for YoY emissions - shows all years in database
app.get('/api/analytics/yoy-emissions-debug', (req, res) => {
  const query = `
    SELECT 
      strftime('%Y', activity_date) as year,
      scope,
      SUM(calculated_co2e) as total_co2e
    FROM EmissionRecords 
    GROUP BY year, scope
    ORDER BY year, scope
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      data: rows,
      message: "All years and scopes from database"
    });
  });
});

// Add download endpoint for database
app.get('/api/download/database', (req, res) => {
  const dbPath = path.join(__dirname, 'data', 'emissions.db');
  
  if (!fs.existsSync(dbPath)) {
    res.status(404).json({ error: 'Database file not found' });
    return;
  }
  
  res.download(dbPath, 'emissions_database.db', (err) => {
    if (err) {
    console.error('Error downloading database:', err);
      res.status(500).json({ error: 'Failed to download database' });
    }
  });
});

app.get('/api/analytics/emission-intensity', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  const emissionsQuery = `
    SELECT SUM(calculated_co2e) as total_emissions
    FROM EmissionRecords 
    WHERE strftime('%Y', activity_date) = ?
  `;
  
  const productionQuery = `
    SELECT SUM(value) as total_production
    FROM BusinessMetrics 
    WHERE metric_name = 'Tons of Steel Produced'
    AND strftime('%Y', date) = ?
  `;
  
  db.get(emissionsQuery, [year.toString()], (err, emissionsData) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.get(productionQuery, [year.toString()], (err, productionData) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const intensity = productionData.total_production ? 
        (emissionsData.total_emissions / productionData.total_production) : 0;
      
      res.json({
        year: year,
        total_emissions: emissionsData.total_emissions || 0,
        total_production: productionData.total_production || 0,
        intensity: intensity,
        unit: 'kgCO2e/tonne'
      });
    });
  });
});

app.get('/api/analytics/emission-hotspots', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  const query = `
    SELECT 
      activity_name,
      scope,
      SUM(calculated_co2e) as total_co2e,
      COUNT(*) as record_count
    FROM EmissionRecords 
    WHERE strftime('%Y', activity_date) = ?
    GROUP BY activity_name, scope
    ORDER BY total_co2e DESC
  `;
  
  db.all(query, [year.toString()], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const total = rows.reduce((sum, row) => sum + row.total_co2e, 0);
    const result = rows.map(row => ({
      ...row,
      percentage: total > 0 ? ((row.total_co2e / total) * 100).toFixed(2) : 0
    }));
    
    res.json({
      year: year,
      total_emissions: total,
      hotspots: result
    });
  });
});

app.get('/api/analytics/monthly-trends', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  const query = `
    SELECT 
      strftime('%Y-%m', activity_date) as month,
      scope,
      SUM(calculated_co2e) as total_co2e
    FROM EmissionRecords 
    WHERE strftime('%Y', activity_date) = ?
    GROUP BY month, scope
    ORDER BY month, scope
  `;
  
  db.all(query, [year.toString()], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ year: year, data: rows });
  });
});

app.post('/api/business-metrics', (req, res) => {
  const { date, metric_name, value, unit } = req.body;
  
    console.log(' Adding NEW business metric:', { date, metric_name, value, unit });
  
  const query = `
    INSERT INTO BusinessMetrics (date, metric_name, value, unit)
    VALUES (?, ?, ?, ?)
  `;
  
  db.run(query, [date, metric_name, value, unit], function(err) {
    if (err) {
    console.error(' Error inserting metric:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log(' NEW business metric created with ID:', this.lastID);
    res.json({ 
      id: this.lastID, 
      message: 'Business metric added successfully!' 
    });
  });
});

app.get('/api/business-metrics', (req, res) => {
  db.all('SELECT * FROM BusinessMetrics ORDER BY date DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Business metrics summary endpoint
app.get('/api/business-metrics/summary', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  const query = `
    SELECT 
      metric_name,
      SUM(value) as total_value,
      AVG(value) as avg_value,
      COUNT(*) as record_count,
      unit
    FROM BusinessMetrics 
    WHERE strftime('%Y', date) = ?
    GROUP BY metric_name, unit
    ORDER BY metric_name
  `;
  
  db.all(query, [year.toString()], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      year: year,
      metrics: rows
    });
  });
});

// Bulk insert emission factors
app.post('/api/emission-factors/bulk', (req, res) => {
  const { factors } = req.body;
  
  if (!factors || !Array.isArray(factors)) {
    res.status(400).json({ error: 'Expected array of factors' });
    return;
  }
  
    console.log(` Bulk inserting ${factors.length} emission factors...`);
  
  const stmt = db.prepare(`
    INSERT INTO EmissionFactors (activity_name, unit, co2e_factor, scope, source, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  let inserted = 0;
  let errors = [];
  
  factors.forEach((factor, index) => {
    try {
      const { activity_name, unit, co2e_factor, scope, source, valid_from, valid_to } = factor;
      stmt.run([activity_name, unit, co2e_factor, scope, source, valid_from, valid_to]);
      inserted++;
    } catch (error) {
      errors.push({ index, error: error.message });
    }
  });
  
  stmt.finalize();
  
    console.log(` Bulk insert complete: ${inserted} factors inserted, ${errors.length} errors`);
  
  res.json({
    success: true,
    inserted: inserted,
    errors: errors,
    message: `Successfully inserted ${inserted} emission factors`
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('GHG EMISSIONS PLATFORM - READY');
    console.log(`Dashboard: http://localhost:${PORT}`);
    
    const dataDir = path.join(__dirname, 'data');
    const dbPath = path.join(dataDir, 'emissions.db');
    
    if (fs.existsSync(dbPath)) {
      console.log('Database: data/emissions.db');
      const stats = fs.statSync(dbPath);
      console.log(`Database size: ${(stats.size / 1024).toFixed(1)} KB`);
    }
    
    console.log('');
    console.log('SYSTEM READY:');
    console.log('- Database is primary data source');
    console.log('- All operations use database only');
    console.log('- Forms ready for new data entry');
  });
}).catch(error => {
  console.error('INITIALIZATION FAILED:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      console.log('Goodbye!');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
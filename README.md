## LIVE: https://ghg-emissions-platform.onrender.com/

# GHG Emissions Platform
A comprehensive Greenhouse Gas (GHG) emissions reporting platform built according to the GHG Protocol standards. This platform enables organizations to track, calculate, and analyze their carbon emissions across all three scopes, with support for versioned emission factors and business metrics integration.

## 🏗️ Architecture Overview

### System Architecture

The GHG Emissions Platform follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Dashboard     │  │   Data Entry    │  │   Analytics     │ │
│  │   (Charts.js)   │  │   Forms         │  │   Reporting     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Emission      │  │   Business      │  │   Analytics     │ │
│  │   Records API   │  │   Metrics API   │  │   API           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Emission      │  │   Factor        │  │   Audit         │ │
│  │   Calculation   │  │   Management    │  │   Logging       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│                    SQLite Database                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ EmissionFactors │  │ EmissionRecords │  │ BusinessMetrics │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐                                        │
│  │   AuditLog      │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3 (with full SQL support)
- **Frontend**: Vanilla HTML/CSS/JavaScript with Chart.js
- **API**: RESTful API design
- **Containerization**: Docker support

## 📊 Data Models & Schema

### Core Tables

#### 1. EmissionFactors
Stores versioned emission factors with temporal validity:

```sql
CREATE TABLE EmissionFactors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_name TEXT NOT NULL,           -- Activity type (e.g., "Diesel", "Natural Gas")
  unit TEXT NOT NULL,                    -- Unit of measurement (e.g., "KL", "kWh")
  co2e_factor REAL NOT NULL,             -- CO2 equivalent factor
  scope INTEGER NOT NULL,                -- GHG Protocol scope (1, 2, or 3)
  source TEXT NOT NULL,                  -- Data source reference
  valid_from DATE NOT NULL,              -- Factor validity start date
  valid_to DATE,                         -- Factor validity end date (NULL = current)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- **Versioned Factors**: Support for time-based emission factor changes
- **Scope Classification**: Aligned with GHG Protocol scopes
- **Source Tracking**: Maintains data lineage and audit trail

#### 2. EmissionRecords
Core emission data with calculated CO2e values:

```sql
CREATE TABLE EmissionRecords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_date DATE NOT NULL,           -- Date of emission activity
  activity_name TEXT NOT NULL,           -- Activity performed
  activity_data REAL NOT NULL,           -- Quantity of activity
  unit TEXT NOT NULL,                    -- Unit of measurement
  emission_factor_id INTEGER,            -- Link to emission factor used
  calculated_co2e REAL NOT NULL,         -- Calculated CO2 equivalent
  scope INTEGER NOT NULL,                -- GHG Protocol scope
  is_override BOOLEAN DEFAULT 0,         -- Manual calculation override flag
  override_reason TEXT,                  -- Reason for manual override
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emission_factor_id) REFERENCES EmissionFactors(id)
);
```

**Key Features:**
- **Automatic Calculation**: CO2e calculated using appropriate emission factors
- **Manual Overrides**: Support for expert adjustments with audit trail
- **Temporal Factor Selection**: Automatically selects correct factor based on activity date

#### 3. BusinessMetrics
Business performance data for intensity calculations:

```sql
CREATE TABLE BusinessMetrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,                    -- Metric reporting date
  metric_name TEXT NOT NULL,             -- Business metric name
  value REAL NOT NULL,                   -- Metric value
  unit TEXT NOT NULL,                    -- Unit of measurement
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- **Flexible Metrics**: Support for various business KPIs
- **Intensity Calculations**: Enable emission intensity reporting
- **Time Series**: Track business performance over time

#### 4. AuditLog
Complete audit trail for data changes:

```sql
CREATE TABLE AuditLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,            -- Reference to modified record
  action TEXT NOT NULL,                  -- Type of action performed
  old_value REAL,                        -- Previous value
  new_value REAL,                        -- New value
  reason TEXT,                           -- Reason for change
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (record_id) REFERENCES EmissionRecords(id)
);
```

### Data Relationships

```
EmissionFactors ──────┐
                     │ (1:N)
                     ▼
EmissionRecords ──────┐
                     │ (1:N)
                     ▼
                  AuditLog

BusinessMetrics (Independent table for business KPIs)
```

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **Git** (optional, for cloning)

### Installation & Setup

1. **Clone or Download the Project**
   ```bash
   git clone <repository-url>
   cd ghg-emissions-platform
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Access the Dashboard**
   - Open your browser to: `http://localhost:3000`
   - The application will automatically create the database and populate sample data

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

### Docker Setup (Optional)

1. **Build Docker Image**
   ```bash
   docker build -t ghg-emissions-platform .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 -v $(pwd)/data:/app/data ghg-emissions-platform
   ```

## 📋 Sample Data & Pre-Population

The platform automatically creates comprehensive sample data on first run to provide meaningful analysis and avoid skewed graphs.

### Pre-populated Emission Factors

The system includes versioned emission factors with both current and expired entries:

#### Current Factors (2024)
```javascript
// Active emission factors for 2024
[
  { activity_name: 'Diesel', unit: 'KL', co2e_factor: 2.539, scope: 1, valid_from: '2024-01-01', valid_to: '2024-12-31' },
  { activity_name: 'Natural Gas', unit: 'kNm3', co2e_factor: 2.425, scope: 1, valid_from: '2024-01-01', valid_to: '2024-12-31' },
  { activity_name: 'Grid Electricity', unit: 'kWh', co2e_factor: 0.8, scope: 2, valid_from: '2024-01-01', valid_to: '2024-12-31' }
]
```

#### Historical Factors (2022-2023)
```javascript
// Expired factors showing factor evolution over time
[
  { activity_name: 'Grid Electricity', unit: 'kWh', co2e_factor: 0.85, scope: 2, valid_from: '2022-01-01', valid_to: '2023-12-31' },
  { activity_name: 'Diesel', unit: 'KL', co2e_factor: 2.52, scope: 1, valid_from: '2022-01-01', valid_to: '2023-12-31' }
]
```

### Pre-populated Business Metrics

Sample business performance data for emission intensity calculations:

```javascript
// Monthly steel production data (2024)
[
  { date: '2024-01-31', metric_name: 'Tons of Steel Produced', value: 5000, unit: 'tonnes' },
  { date: '2024-02-29', metric_name: 'Tons of Steel Produced', value: 4800, unit: 'tonnes' },
  { date: '2024-03-31', metric_name: 'Tons of Steel Produced', value: 5200, unit: 'tonnes' },
  { date: '2024-04-30', metric_name: 'Tons of Steel Produced', value: 4900, unit: 'tonnes' },
  { date: '2024-05-31', metric_name: 'Tons of Steel Produced', value: 5100, unit: 'tonnes' },
  { date: '2024-06-30', metric_name: 'Tons of Steel Produced', value: 4850, unit: 'tonnes' },
  { date: '2024-07-31', metric_name: 'Tons of Steel Produced', value: 5300, unit: 'tonnes' },
  { date: '2024-08-31', metric_name: 'Tons of Steel Produced', value: 5000, unit: 'tonnes' },
  { date: '2024-08-31', metric_name: 'Employee Count', value: 920, unit: 'employees' }
]
```

### Pre-populated Emission Records

Representative emission data across multiple periods and scopes:

```javascript
// Sample emission activities
[
  { date: '2024-01-15', activity_name: 'Diesel', activity_data: 100, unit: 'KL', calculated_co2e: 253900, scope: 1 },
  { date: '2024-01-15', activity_name: 'Grid Electricity', activity_data: 10000, unit: 'kWh', calculated_co2e: 8000, scope: 2 }
]
```

### Data Generation Strategy

The pre-population strategy ensures:

1. **Realistic Data Distribution**: Varied emission levels across different time periods
2. **Multi-Scope Coverage**: Examples from Scope 1, 2, and 3 emissions
3. **Seasonal Patterns**: Business-realistic seasonal variations
4. **Factor Evolution**: Historical factors to demonstrate versioning
5. **Complete Workflows**: End-to-end examples for all major features

## 🔧 API Endpoints

### Core Data Management

#### Emission Records
- `GET /api/emission-records` - Retrieve all emission records
- `POST /api/emission-records` - Create new emission record
- `GET /api/debug/quick-check` - Database health check

#### Emission Factors
- `GET /api/emission-factors` - Retrieve all emission factors
- `POST /api/emission-factors/bulk` - Bulk insert emission factors

#### Business Metrics
- `GET /api/business-metrics` - Retrieve all business metrics
- `POST /api/business-metrics` - Create new business metric
- `GET /api/business-metrics/summary` - Get metrics summary by year

### Analytics Endpoints

#### Emission Analysis
- `GET /api/analytics/yoy-emissions` - Year-over-year emission comparison
- `GET /api/analytics/monthly-trends` - Monthly emission trends
- `GET /api/analytics/emission-hotspots` - Top emission sources analysis
- `GET /api/analytics/emission-intensity` - Emission intensity calculations

#### Utility Endpoints
- `GET /api/download/database` - Download complete database
- `GET /api/analytics/yoy-emissions-debug` - Debug endpoint for data verification

### API Usage Examples

#### Adding Emission Record
```javascript
POST /api/emission-records
{
  "activity_date": "2024-03-15",
  "activity_name": "Diesel",
  "activity_data": 150,
  "unit": "KL"
}
```

#### Bulk Adding Emission Factors
```javascript
POST /api/emission-factors/bulk
{
  "factors": [
    {
      "activity_name": "Gasoline",
      "unit": "L",
      "co2e_factor": 2.31,
      "scope": 1,
      "source": "EPA 2024",
      "valid_from": "2024-01-01",
      "valid_to": "2024-12-31"
    }
  ]
}
```

## 📈 Features

### Core Functionality
- ✅ **Multi-Scope Emissions Tracking** (Scope 1, 2, 3)
- ✅ **Versioned Emission Factors** with temporal validity
- ✅ **Automatic CO2e Calculations** with manual override capability
- ✅ **Business Metrics Integration** for intensity reporting
- ✅ **Complete Audit Trail** for all data changes
- ✅ **Bulk Data Import** capabilities

### Analytics & Reporting
- ✅ **Year-over-Year Comparisons**
- ✅ **Monthly Trend Analysis**
- ✅ **Emission Hotspot Identification**
- ✅ **Emission Intensity Calculations**
- ✅ **Interactive Dashboard** with Chart.js visualizations

### Data Management
- ✅ **Robust Database Schema** with foreign key constraints
- ✅ **Automatic Sample Data Generation**
- ✅ **Database Export/Import** functionality
- ✅ **RESTful API** for system integration

## 🗂️ Project Structure

```
ghg-emissions-platform/
├── package.json              # Node.js dependencies and scripts
├── server.js                 # Main application server
├── Dockerfile               # Container configuration
├── .dockerignore           # Docker ignore patterns
├── README.md               # This documentation
├── data/                   # Database directory
│   └── emissions.db        # SQLite database file
└── public/                 # Frontend assets
    └── index.html         # Main dashboard interface
```

## 🛠️ Development

### Database Schema Updates

To modify the database schema, edit the `createTables()` function in `server.js:69-130`.

### Adding New Emission Factors

Use the bulk insert API or add them directly in the `createSampleData()` function in `server.js:234-264`.

### Extending Analytics

Add new analytics endpoints following the pattern in the existing analytics routes (`server.js:399-568`).

### Frontend Customization

Modify `public/index.html` to customize the dashboard appearance and functionality.

## 📊 Data Export

The platform provides database export functionality:

1. **Via API**: `GET /api/download/database`
2. **Direct File**: Access `data/emissions.db` directly
3. **SQL Dumps**: Use SQLite tools for custom exports

## 🔒 Security Considerations

- **Input Validation**: All API endpoints validate input data
- **SQL Injection Protection**: Uses parameterized queries
- **Audit Logging**: Complete trail of data modifications
- **Data Integrity**: Foreign key constraints maintain referential integrity

## 🚦 System Status

Check system health using:
```bash
curl http://localhost:3000/api/debug/quick-check
```

This endpoint returns:
- Total record count
- Breakdown by year and scope
- Database health status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with appropriate tests
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and feature requests, please refer to the project documentation or create an issue in the project repository.

---


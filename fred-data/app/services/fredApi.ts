// FRED API service for fetching real economic data via Next.js API routes

export interface ChartDataPoint {
  date: string;
  year: string;
  value: number;
}

interface ApiResponse {
  data: ChartDataPoint[];
}

class FredApiService {
  private async fetchFromApi(
    seriesId: string, 
    frequency: string = 'a',
    startDate: string = '2019-01-01'
  ): Promise<ChartDataPoint[]> {
    const params = new URLSearchParams({
      frequency,
      start: startDate,
    });

    try {
      const response = await fetch(`/api/fred/${seriesId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result: ApiResponse = await response.json();
      return result.data;
    } catch (error) {
      console.error(`Error fetching data for ${seriesId}:`, error);
      throw error;
    }
  }

  async getCPIData(): Promise<ChartDataPoint[]> {
    // CPIAUCSL - Consumer Price Index for All Urban Consumers: All Items
    return this.fetchFromApi('CPIAUCSL', 'a');
  }

  async getUnemploymentData(): Promise<ChartDataPoint[]> {
    // UNRATE - Unemployment Rate
    // Use monthly data to capture COVID variations better
    return this.fetchFromApi('UNRATE', 'm');
  }

  async get10YearTreasuryData(): Promise<ChartDataPoint[]> {
    // DGS10 - 10-Year Treasury Constant Maturity Rate
    return this.fetchFromApi('DGS10', 'a');
  }

  async get3MonthTreasuryData(): Promise<ChartDataPoint[]> {
    // DGS3MO - 3-Month Treasury Constant Maturity Rate
    return this.fetchFromApi('DGS3MO', 'a');
  }

  // Inflation indicators
  async getCoreCPIData(): Promise<ChartDataPoint[]> {
    // CPILFESL - Consumer Price Index for All Urban Consumers: All Items Less Food & Energy
    return this.fetchFromApi('CPILFESL', 'a');
  }

  async getPCEInflationData(): Promise<ChartDataPoint[]> {
    // PCEPILFE - Personal Consumption Expenditures Excluding Food and Energy (Chain-Type Price Index)
    return this.fetchFromApi('PCEPILFE', 'a');
  }

  // Employment indicators
  async getNonfarmPayrollsData(): Promise<ChartDataPoint[]> {
    // PAYEMS - All Employees, Total Nonfarm
    return this.fetchFromApi('PAYEMS', 'm');
  }

  async getLaborParticipationData(): Promise<ChartDataPoint[]> {
    // CIVPART - Labor Force Participation Rate
    return this.fetchFromApi('CIVPART', 'm');
  }

  // Additional Interest Rates
  async getFederalFundsRateData(): Promise<ChartDataPoint[]> {
    // FEDFUNDS - Federal Funds Effective Rate
    return this.fetchFromApi('FEDFUNDS', 'm');
  }

  async get2YearTreasuryData(): Promise<ChartDataPoint[]> {
    // DGS2 - 2-Year Treasury Constant Maturity Rate
    return this.fetchFromApi('DGS2', 'a');
  }

  async get30YearTreasuryData(): Promise<ChartDataPoint[]> {
    // DGS30 - 30-Year Treasury Constant Maturity Rate
    return this.fetchFromApi('DGS30', 'a');
  }

  // Economic Growth indicators
  async getGDPData(): Promise<ChartDataPoint[]> {
    // GDP - Gross Domestic Product
    return this.fetchFromApi('GDP', 'q');
  }

  async getIndustrialProductionData(): Promise<ChartDataPoint[]> {
    // INDPRO - Industrial Production Total Index
    return this.fetchFromApi('INDPRO', 'm');
  }

  // Housing indicators
  async getHousingStartsData(): Promise<ChartDataPoint[]> {
    // HOUST - Housing Starts: Total: New Privately Owned Housing Units Started
    return this.fetchFromApi('HOUST', 'm');
  }

  async getHomePriceIndexData(): Promise<ChartDataPoint[]> {
    // CSUSHPISA - S&P/Case-Shiller U.S. National Home Price Index
    return this.fetchFromApi('CSUSHPISA', 'm');
  }

  async getMortgageRatesData(): Promise<ChartDataPoint[]> {
    // MORTGAGE30US - 30-Year Fixed Rate Mortgage Average
    return this.fetchFromApi('MORTGAGE30US', 'm');
  }

  async getHomeownershipRateData(): Promise<ChartDataPoint[]> {
    // RHORUSQ156N - Homeownership Rate
    return this.fetchFromApi('RHORUSQ156N', 'q');
  }

  // Consumer Spending indicators
  async getPersonalConsumptionData(): Promise<ChartDataPoint[]> {
    // PCE - Personal Consumption Expenditures
    return this.fetchFromApi('PCE', 'q');
  }

  async getRetailSalesData(): Promise<ChartDataPoint[]> {
    // RSAFS - Advance Retail Sales: Retail and Food Services
    return this.fetchFromApi('RSAFS', 'm');
  }

  async getConsumerConfidenceData(): Promise<ChartDataPoint[]> {
    // UMCSENT - University of Michigan: Consumer Sentiment
    return this.fetchFromApi('UMCSENT', 'm');
  }

  async getDurableGoodsData(): Promise<ChartDataPoint[]> {
    // PCEDG - Personal Consumption Expenditures: Durable Goods
    return this.fetchFromApi('PCEDG', 'q');
  }

  async getServicesData(): Promise<ChartDataPoint[]> {
    // PCESV - Personal Consumption Expenditures: Services
    return this.fetchFromApi('PCESV', 'q');
  }

  // Business Investment and Productivity indicators
  async getBusinessInvestmentData(): Promise<ChartDataPoint[]> {
    // GPDI - Gross Private Domestic Investment
    return this.fetchFromApi('GPDI', 'q');
  }

  async getCapacityUtilizationData(): Promise<ChartDataPoint[]> {
    // TCU - Capacity Utilization: Total Index
    return this.fetchFromApi('TCU', 'm');
  }

  async getProductivityData(): Promise<ChartDataPoint[]> {
    // OPHNFB - Nonfarm Business Sector: Labor Productivity
    return this.fetchFromApi('OPHNFB', 'q');
  }

  // Exchange Rates indicators
  async getEuroExchangeRateData(): Promise<ChartDataPoint[]> {
    // DEXUSEU - U.S. / Euro Foreign Exchange Rate
    return this.fetchFromApi('DEXUSEU', 'm');
  }

  async getYenExchangeRateData(): Promise<ChartDataPoint[]> {
    // DEXJPUS - Japan / U.S. Foreign Exchange Rate
    return this.fetchFromApi('DEXJPUS', 'm');
  }

  async getPoundExchangeRateData(): Promise<ChartDataPoint[]> {
    // DEXUSUK - U.S. / U.K. Foreign Exchange Rate
    return this.fetchFromApi('DEXUSUK', 'm');
  }

  async getYuanExchangeRateData(): Promise<ChartDataPoint[]> {
    // DEXCHUS - China / U.S. Foreign Exchange Rate
    return this.fetchFromApi('DEXCHUS', 'm');
  }

  async getTradeBalanceData(): Promise<ChartDataPoint[]> {
    // BOPGSTB - Trade Balance: Goods and Services, Balance of Payments Basis
    return this.fetchFromApi('BOPGSTB', 'm');
  }

  // Additional Inflation indicators

  async getProducerPriceIndexData(): Promise<ChartDataPoint[]> {
    // PPIFIS - Producer Price Index for Finished Goods
    return this.fetchFromApi('PPIFIS', 'm');
  }

  // Additional Employment indicators
  async getInitialJoblessClaimsData(): Promise<ChartDataPoint[]> {
    // ICSA - Initial Claims
    return this.fetchFromApi('ICSA', 'w');
  }

  async getAverageHourlyEarningsData(): Promise<ChartDataPoint[]> {
    // AHETPI - Average Hourly Earnings of Production and Nonsupervisory Employees
    return this.fetchFromApi('AHETPI', 'm');
  }

  // Additional Economic Growth indicators  
  async getManufacturingEmploymentData(): Promise<ChartDataPoint[]> {
    // MANEMP - All Employees, Manufacturing
    return this.fetchFromApi('MANEMP', 'm');
  }

  async getConsumerSentimentData(): Promise<ChartDataPoint[]> {
    // UMCSENT - University of Michigan: Consumer Sentiment
    return this.fetchFromApi('UMCSENT', 'm');
  }

  // Additional Housing indicators
  async getBuildingPermitsData(): Promise<ChartDataPoint[]> {
    // PERMIT - New Private Housing Units Authorized by Building Permits
    return this.fetchFromApi('PERMIT', 'm');
  }

  async getExistingHomeSalesData(): Promise<ChartDataPoint[]> {
    // EXHOSLUSM495S - Existing Home Sales
    return this.fetchFromApi('EXHOSLUSM495S', 'm');
  }

  // Additional Consumer Spending indicators
  async getCreditCardSpendingData(): Promise<ChartDataPoint[]> {
    // CCPIC - Consumer Credit Outstanding
    return this.fetchFromApi('TOTALSL', 'm');
  }

  async getSeasonalRetailSalesData(): Promise<ChartDataPoint[]> {
    // RSAFSNA - Retail Sales: Total (Not Seasonally Adjusted)
    return this.fetchFromApi('RSAFSNA', 'm');
  }

  // Additional Exchange Rate indicators
  async getCanadianDollarRateData(): Promise<ChartDataPoint[]> {
    // DEXCAUS - Canada / U.S. Foreign Exchange Rate
    return this.fetchFromApi('DEXCAUS', 'm');
  }

  async getMexicanPesoRateData(): Promise<ChartDataPoint[]> {
    // DEXMXUS - Mexico / U.S. Foreign Exchange Rate
    return this.fetchFromApi('DEXMXUS', 'm');
  }

  async getBrazilianRealRateData(): Promise<ChartDataPoint[]> {
    // DEXBZUS - Brazil / U.S. Foreign Exchange Rate
    return this.fetchFromApi('DEXBZUS', 'm');
  }

  async getIndianRupeeRateData(): Promise<ChartDataPoint[]> {
    // DEXINUS - India / U.S. Foreign Exchange Rate
    return this.fetchFromApi('DEXINUS', 'm');
  }
}

export const fredApi = new FredApiService();
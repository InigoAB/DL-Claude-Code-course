import { NextRequest, NextResponse } from 'next/server';

const FRED_API_KEY = 'cd1a81437fd59aa819376ca28841e8bc';
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface FredDataPoint {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredDataPoint[];
}

export interface ChartDataPoint {
  date: string;
  year: string;
  value: number;
}

async function fetchFredData(
  seriesId: string, 
  startDate: string = '2019-01-01',
  endDate?: string,
  frequency: string = 'a'
): Promise<ChartDataPoint[]> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,
    file_type: 'json',
    frequency: frequency,
    observation_start: startDate,
    ...(endDate && { observation_end: endDate }),
  });

  try {
    const response = await fetch(`${FRED_BASE_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
    }
    
    const data: FredResponse = await response.json();
    
    if (!data.observations) {
      throw new Error('Invalid response format from FRED API');
    }
    
    return data.observations
      .filter(obs => obs.value !== '.' && obs.value !== '' && obs.value !== null)
      .map(obs => ({
        date: obs.date,
        year: new Date(obs.date).getFullYear().toString(),
        value: parseFloat(obs.value),
      }))
      .filter(obs => !isNaN(obs.value));
  } catch (error) {
    console.error(`Error fetching FRED data for ${seriesId}:`, error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { series: string } }
) {
  try {
    const series = params.series;
    const searchParams = request.nextUrl.searchParams;
    const frequency = searchParams.get('frequency') || 'a';
    const startDate = searchParams.get('start') || '2019-01-01';
    const endDate = searchParams.get('end');

    // Validate series ID
    const validSeries = [
      // Key Indicators
      'CPIAUCSL', 'UNRATE', 'DGS10', 'DGS3MO',
      // Inflation
      'CPILFESL', 'CPIULFSL', 'PCEPILFE', 'CPIFABSL',
      // Employment  
      'PAYEMS', 'CIVPART', 'EMRATIO', 'AWHMAN',
      // Interest Rates
      'DGS1MO', 'DGS2', 'DGS5', 'DGS30', 'FEDFUNDS',
      // Economic Growth
      'GDP', 'GDPC1', 'GDPPOT', 'INDPRO', 'GPDI', 'TCU', 'OPHNFB',
      // Exchange Rates
      'DEXUSEU', 'DEXJPUS', 'DEXUSUK', 'DEXCHUS', 'BOPGSTB',
      // Housing
      'HOUST', 'CSUSHPISA', 'MORTGAGE30US', 'RHORUSQ156N',
      // Consumer Spending
      'PCE', 'PCEDG', 'PCESV', 'RSAFS', 'UMCSENT'
    ];
    if (!validSeries.includes(series.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid series ID' },
        { status: 400 }
      );
    }

    const data = await fetchFredData(series.toUpperCase(), startDate, endDate || undefined, frequency);
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FRED data' },
      { status: 500 }
    );
  }
}
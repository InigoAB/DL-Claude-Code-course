import { fredApi } from '../../app/services/fredApi'

// Mock fetch globally
global.fetch = jest.fn()

describe('FredApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('fetchFromApi', () => {
    it('should fetch data successfully', async () => {
      const mockApiResponse = {
        data: [
          { date: '2023-01-01', year: '2023', value: 100.5 },
          { date: '2023-02-01', year: '2023', value: 101.2 },
        ]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      })

      const result = await fredApi.getCPIData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/CPIAUCSL?frequency=a&start=2019-01-01')
      expect(result).toEqual(mockApiResponse.data)
    })

    it('should handle API errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(fredApi.getCPIData()).rejects.toThrow('API error: 500 Internal Server Error')
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(fredApi.getCPIData()).rejects.toThrow('Network error')
    })
  })

  describe('Key Indicators', () => {
    it('should fetch CPI data with correct parameters', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 100 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getCPIData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/CPIAUCSL?frequency=a&start=2019-01-01')
      expect(result).toEqual(mockData)
    })

    it('should fetch unemployment data with monthly frequency', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 3.5 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getUnemploymentData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/UNRATE?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })

    it('should fetch 10-year treasury data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 4.5 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.get10YearTreasuryData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/DGS10?frequency=a&start=2019-01-01')
      expect(result).toEqual(mockData)
    })
  })

  describe('Manufacturing and Economic Indicators', () => {
    it('should fetch manufacturing employment data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 12500 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getManufacturingEmploymentData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/MANEMP?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })

    it('should fetch consumer sentiment data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 95.2 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getConsumerSentimentData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/UMCSENT?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })

    it('should fetch industrial production data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 102.5 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getIndustrialProductionData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/INDPRO?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })

    it('should fetch trade balance data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: -65000 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getTradeBalanceData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/BOPGSTB?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })
  })

  describe('Exchange Rates', () => {
    it('should fetch Euro exchange rate data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 1.05 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getEuroExchangeRateData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/DEXUSEU?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })

    it('should fetch Canadian dollar exchange rate data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 1.35 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getCanadianDollarRateData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/DEXCAUS?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })
  })

  describe('Housing Indicators', () => {
    it('should fetch housing starts data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 1400 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getHousingStartsData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/HOUST?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })

    it('should fetch building permits data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 1500 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getBuildingPermitsData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/PERMIT?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })
  })

  describe('Consumer Spending', () => {
    it('should fetch retail sales data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 650000 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getRetailSalesData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/RSAFS?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })

    it('should fetch credit card spending data', async () => {
      const mockData = [{ date: '2023-01-01', year: '2023', value: 4500 }]
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fredApi.getCreditCardSpendingData()

      expect(fetch).toHaveBeenCalledWith('/api/fred/TOTALSL?frequency=m&start=2019-01-01')
      expect(result).toEqual(mockData)
    })
  })
})
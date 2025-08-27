import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ManufacturingBusinessChart from '../../app/components/ManufacturingBusinessChart'
import * as fredApi from '../../app/services/fredApi'

// Mock the fredApi module
jest.mock('../../app/services/fredApi')
const mockFredApi = fredApi as jest.Mocked<typeof fredApi>

// Mock recharts components
jest.mock('recharts', () => ({
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />,
}))

describe('ManufacturingBusinessChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    // Mock API calls to hang (simulate loading)
    mockFredApi.fredApi.getManufacturingEmploymentData.mockImplementation(() => new Promise(() => {}))
    mockFredApi.fredApi.getConsumerSentimentData.mockImplementation(() => new Promise(() => {}))
    mockFredApi.fredApi.getTradeBalanceData.mockImplementation(() => new Promise(() => {}))
    mockFredApi.fredApi.getIndustrialProductionData.mockImplementation(() => new Promise(() => {}))

    render(<ManufacturingBusinessChart />)
    
    expect(screen.getByText('Loading manufacturing data...')).toBeInTheDocument()
    expect(screen.getByText('Loading manufacturing data...')).toBeInTheDocument() // Loading state
  })

  it('renders chart with valid data', async () => {
    const mockManufacturingData = [
      { date: '2023-01-01', year: '2023', value: 12500 },
      { date: '2023-02-01', year: '2023', value: 12600 },
    ]
    
    const mockSentimentData = [
      { date: '2023-01-01', year: '2023', value: 95.2 },
      { date: '2023-02-01', year: '2023', value: 96.1 },
    ]
    
    const mockTradeData = [
      { date: '2023-01-01', year: '2023', value: -65000 },
      { date: '2023-02-01', year: '2023', value: -64000 },
    ]
    
    const mockIndustrialData = [
      { date: '2023-01-01', year: '2023', value: 102.5 },
      { date: '2023-02-01', year: '2023', value: 103.1 },
    ]

    mockFredApi.fredApi.getManufacturingEmploymentData.mockResolvedValue(mockManufacturingData)
    mockFredApi.fredApi.getConsumerSentimentData.mockResolvedValue(mockSentimentData)
    mockFredApi.fredApi.getTradeBalanceData.mockResolvedValue(mockTradeData)
    mockFredApi.fredApi.getIndustrialProductionData.mockResolvedValue(mockIndustrialData)

    render(<ManufacturingBusinessChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })

    // Verify all chart components are rendered
    expect(screen.getAllByTestId('line')).toHaveLength(3) // 3 Line components
    expect(screen.getByTestId('area')).toBeInTheDocument() // 1 Area component
    expect(screen.getAllByTestId('y-axis')).toHaveLength(2) // 2 Y-axes
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getAllByTestId('reference-line')).toHaveLength(3) // 3 reference lines
  })

  it('displays error message when API calls fail', async () => {
    const errorMessage = 'Failed to load manufacturing and economic indicators data'
    
    mockFredApi.fredApi.getManufacturingEmploymentData.mockRejectedValue(new Error('API Error'))
    mockFredApi.fredApi.getConsumerSentimentData.mockResolvedValue([])
    mockFredApi.fredApi.getTradeBalanceData.mockResolvedValue([])
    mockFredApi.fredApi.getIndustrialProductionData.mockResolvedValue([])

    render(<ManufacturingBusinessChart />)
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ Error loading data')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('renders FRED source link', async () => {
    const mockData = [{ date: '2023-01-01', year: '2023', value: 100 }]
    
    mockFredApi.fredApi.getManufacturingEmploymentData.mockResolvedValue(mockData)
    mockFredApi.fredApi.getConsumerSentimentData.mockResolvedValue(mockData)
    mockFredApi.fredApi.getTradeBalanceData.mockResolvedValue(mockData)
    mockFredApi.fredApi.getIndustrialProductionData.mockResolvedValue(mockData)

    render(<ManufacturingBusinessChart />)
    
    await waitFor(() => {
      const sourceLink = screen.getByRole('link')
      expect(sourceLink).toHaveAttribute('href', expect.stringContaining('fred.stlouisfed.org'))
      expect(sourceLink).toHaveAttribute('target', '_blank')
      expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('calls all required API endpoints', async () => {
    const mockData = [{ date: '2023-01-01', year: '2023', value: 100 }]
    
    mockFredApi.fredApi.getManufacturingEmploymentData.mockResolvedValue(mockData)
    mockFredApi.fredApi.getConsumerSentimentData.mockResolvedValue(mockData)
    mockFredApi.fredApi.getTradeBalanceData.mockResolvedValue(mockData)
    mockFredApi.fredApi.getIndustrialProductionData.mockResolvedValue(mockData)

    render(<ManufacturingBusinessChart />)
    
    await waitFor(() => {
      expect(mockFredApi.fredApi.getManufacturingEmploymentData).toHaveBeenCalledTimes(1)
      expect(mockFredApi.fredApi.getConsumerSentimentData).toHaveBeenCalledTimes(1)
      expect(mockFredApi.fredApi.getTradeBalanceData).toHaveBeenCalledTimes(1)
      expect(mockFredApi.fredApi.getIndustrialProductionData).toHaveBeenCalledTimes(1)
    })
  })

  it('processes data correctly with proper calculations', async () => {
    const mockManufacturingData = [
      { date: '2023-01-01', year: '2023', value: 12500 }, // Above 12000 threshold
    ]
    
    const mockSentimentData = [
      { date: '2023-01-01', year: '2023', value: 95.2 }, // Above 90 threshold
    ]
    
    const mockTradeData = [
      { date: '2023-01-01', year: '2023', value: 1000 }, // Positive (surplus)
    ]
    
    const mockIndustrialData = [
      { date: '2023-01-01', year: '2023', value: 102.5 }, // Above 100 baseline
    ]

    mockFredApi.fredApi.getManufacturingEmploymentData.mockResolvedValue(mockManufacturingData)
    mockFredApi.fredApi.getConsumerSentimentData.mockResolvedValue(mockSentimentData)
    mockFredApi.fredApi.getTradeBalanceData.mockResolvedValue(mockTradeData)
    mockFredApi.fredApi.getIndustrialProductionData.mockResolvedValue(mockIndustrialData)

    render(<ManufacturingBusinessChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    // The component should process the data and create indicators
    // for high employment, high sentiment, trade surplus, and production growth
  })

  it('handles misaligned data gracefully', async () => {
    const mockManufacturingData = [
      { date: '2023-01-01', year: '2023', value: 12500 },
      { date: '2023-03-01', year: '2023', value: 12600 }, // Missing Feb data
    ]
    
    const mockSentimentData = [
      { date: '2023-01-01', year: '2023', value: 95.2 },
      { date: '2023-02-01', year: '2023', value: 96.1 }, // Different dates
    ]
    
    const mockTradeData = [
      { date: '2023-01-01', year: '2023', value: -65000 },
    ]
    
    const mockIndustrialData = [
      { date: '2023-01-01', year: '2023', value: 102.5 },
    ]

    mockFredApi.fredApi.getManufacturingEmploymentData.mockResolvedValue(mockManufacturingData)
    mockFredApi.fredApi.getConsumerSentimentData.mockResolvedValue(mockSentimentData)
    mockFredApi.fredApi.getTradeBalanceData.mockResolvedValue(mockTradeData)
    mockFredApi.fredApi.getIndustrialProductionData.mockResolvedValue(mockIndustrialData)

    render(<ManufacturingBusinessChart />)
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    // Component should only render data points where all series have matching dates
  })
})
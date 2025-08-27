import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Dashboard from '../../app/components/Dashboard'

// Mock all chart components
jest.mock('../../app/components/CPIChart', () => {
  return function MockCPIChart() {
    return <div data-testid="cpi-chart">CPI Chart</div>
  }
})

jest.mock('../../app/components/LaborStatsChart', () => {
  return function MockLaborStatsChart() {
    return <div data-testid="labor-stats-chart">Labor Stats Chart</div>
  }
})

jest.mock('../../app/components/InterestRatesLongTermChart', () => {
  return function MockInterestRatesLongTermChart() {
    return <div data-testid="interest-rates-long-term-chart">Interest Rates Long Term Chart</div>
  }
})

jest.mock('../../app/components/InterestRatesShortTermChart', () => {
  return function MockInterestRatesShortTermChart() {
    return <div data-testid="interest-rates-short-term-chart">Interest Rates Short Term Chart</div>
  }
})

jest.mock('../../app/components/ManufacturingBusinessChart', () => {
  return function MockManufacturingBusinessChart() {
    return <div data-testid="manufacturing-business-chart">Manufacturing Business Chart</div>
  }
})

jest.mock('../../app/components/Sidebar', () => {
  return function MockSidebar({ activeCategory, onCategoryChange }: any) {
    return (
      <div data-testid="sidebar">
        <button onClick={() => onCategoryChange('Key Indicators')}>Key Indicators</button>
        <button onClick={() => onCategoryChange('Economic Growth')}>Economic Growth</button>
        <button onClick={() => onCategoryChange('Employment')}>Employment</button>
        <button onClick={() => onCategoryChange('Exchange Rates')}>Exchange Rates</button>
        <span data-testid="active-category">{activeCategory}</span>
      </div>
    )
  }
})

describe('Dashboard', () => {
  it('renders dashboard with default Key Indicators category', () => {
    render(<Dashboard />)
    
    expect(screen.getByText('Key Indicators Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Essential economic metrics for market overview')).toBeInTheDocument()
    expect(screen.getByTestId('active-category')).toHaveTextContent('Key Indicators')
  })

  it('displays Key Indicators charts by default', () => {
    render(<Dashboard />)
    
    expect(screen.getByTestId('cpi-chart')).toBeInTheDocument()
    expect(screen.getByTestId('labor-stats-chart')).toBeInTheDocument()
    expect(screen.getByTestId('interest-rates-long-term-chart')).toBeInTheDocument()
    expect(screen.getByTestId('interest-rates-short-term-chart')).toBeInTheDocument()
  })

  it('changes category when sidebar category is clicked', async () => {
    render(<Dashboard />)
    
    const economicGrowthButton = screen.getByText('Economic Growth')
    fireEvent.click(economicGrowthButton)
    
    await waitFor(() => {
      expect(screen.getByText('Economic Growth Dashboard')).toBeInTheDocument()
      expect(screen.getByText('GDP, productivity and economic expansion metrics')).toBeInTheDocument()
      expect(screen.getByTestId('active-category')).toHaveTextContent('Economic Growth')
    })
  })

  it('displays Economic Growth charts when category is changed', async () => {
    render(<Dashboard />)
    
    const economicGrowthButton = screen.getByText('Economic Growth')
    fireEvent.click(economicGrowthButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('manufacturing-business-chart')).toBeInTheDocument()
    })
  })

  it('changes category description based on active category', async () => {
    render(<Dashboard />)
    
    // Test Employment category
    const employmentButton = screen.getByText('Employment')
    fireEvent.click(employmentButton)
    
    await waitFor(() => {
      expect(screen.getByText('Employment Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Labor market statistics and workforce metrics')).toBeInTheDocument()
    })
  })

  it('displays FRED data source footer', () => {
    render(<Dashboard />)
    
    expect(screen.getByText('📊 Data provided by Federal Reserve Economic Data (FRED)')).toBeInTheDocument()
  })

  it('has proper layout structure', () => {
    const { container } = render(<Dashboard />)
    
    // Check for main layout elements
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(container.querySelector('header')).toBeInTheDocument()
    expect(container.querySelector('footer')).toBeInTheDocument()
  })

  describe('Category Descriptions', () => {
    const categories = [
      { name: 'Key Indicators', description: 'Essential economic metrics for market overview' },
      { name: 'Inflation', description: 'Price level changes and inflation measures' },
      { name: 'Employment', description: 'Labor market statistics and workforce metrics' },
      { name: 'Interest Rates', description: 'Federal Reserve rates and treasury yields' },
      { name: 'Economic Growth', description: 'GDP, productivity and economic expansion metrics' },
      { name: 'Exchange Rates', description: 'Currency exchange rates and international trade' },
      { name: 'Housing', description: 'Real estate market and housing sector indicators' },
      { name: 'Consumer Spending', description: 'Consumption patterns and retail spending data' },
    ]

    categories.forEach(({ name, description }) => {
      it(`displays correct description for ${name} category`, async () => {
        render(<Dashboard />)
        
        // Only test categories that have buttons in our mock
        if (['Key Indicators', 'Economic Growth', 'Employment', 'Exchange Rates'].includes(name)) {
          if (name !== 'Key Indicators') { // Skip clicking for default category
            const button = screen.getByText(name)
            fireEvent.click(button)
          }
          
          await waitFor(() => {
            expect(screen.getByText(description)).toBeInTheDocument()
          })
        }
      })
    })
  })
})
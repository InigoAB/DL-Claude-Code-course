import React from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Custom render function with providers (if needed in the future)
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, options)
}

// Mock data generators for testing
export const generateMockChartData = (count: number = 5) => {
  return Array.from({ length: count }, (_, index) => ({
    date: `2023-${String(index + 1).padStart(2, '0')}-01`,
    year: '2023',
    value: 100 + Math.random() * 20,
  }))
}

export const generateMockManufacturingData = () => ({
  manufacturingEmployment: generateMockChartData().map(d => ({ ...d, value: 12000 + Math.random() * 1000 })),
  consumerSentiment: generateMockChartData().map(d => ({ ...d, value: 80 + Math.random() * 20 })),
  tradeBalance: generateMockChartData().map(d => ({ ...d, value: -70000 + Math.random() * 10000 })),
  industrialProduction: generateMockChartData().map(d => ({ ...d, value: 100 + Math.random() * 5 })),
})

// Wait for loading states to resolve
export const waitForDataLoad = () => new Promise(resolve => setTimeout(resolve, 100))

// Mock API response helpers
export const createMockApiResponse = (data: any, status: number = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => status < 400 ? { data } : { error: 'API Error' },
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
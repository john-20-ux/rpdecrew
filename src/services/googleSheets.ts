export const fetchEmployeeMetrics = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/metrics');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to fetch employee metrics:', error);
    return [];
  }
};
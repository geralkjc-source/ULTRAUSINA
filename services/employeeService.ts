
export interface Employee {
  matricula: string;
  nome: string;
  funcao: string;
  equipe: string;
}

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1DXQYGVgyIykdqkn7xfsqPp-otjZ8g7vQArSZfUHHIJM/export?format=csv';

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error('Failed to fetch employees');
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // Skip header
    const employees: Employee[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle potential commas inside quotes if necessary, but here simple split seems okay
      // for the data provided.
      const [matricula, nome, funcao, equipe] = line.split(',');
      
      if (nome) {
        employees.push({
          matricula: matricula || '',
          nome: nome.trim(),
          funcao: (funcao || '').trim(),
          equipe: (equipe || '').trim()
        });
      }
    }
    
    return employees;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
}

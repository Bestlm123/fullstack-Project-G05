export function getFacultyFromStudentId(studentId: string): string {
  if (!studentId || studentId.length < 4) return 'Other';
  const facultyCode = studentId.substring(2, 4);

  const facultyMap: Record<string, string> = {
    '01': 'Humanities', '02': 'Education', '03': 'Fine Arts', '04': 'Social Sciences',
    '05': 'Science', '06': 'Engineering', '07': 'Medicine', '08': 'Agriculture',
    '09': 'Dentistry', '10': 'Pharmacy', '11': 'Associated Medical Sciences', '12': 'Nursing',
    '13': 'Agro-Industry', '14': 'Veterinary Medicine', '15': 'Business Administration',
    '16': 'Economics', '17': 'Architecture', '18': 'Mass Communication', '19': 'Political Science',
    '20': 'Law', '21': 'CAMT', '22': 'Public Health', '23': 'Marine Education and Management', 
    '24': 'ICDI', '25': 'Public Policy', '26': 'Biomedical Engineering', 
    '27': 'Health Sciences Research', '28': 'Multidisciplinary Studies',
  };
  return facultyMap[facultyCode] || 'Other';
}
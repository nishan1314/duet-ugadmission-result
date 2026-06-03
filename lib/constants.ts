export const DEPARTMENTS: Record<string, string> = {
  "CE": "Civil Engineering",
  "EEE": "Electrical and Electronic Engineering",
  "ME": "Mechanical Engineering",
  "CSE": "Computer Science and Engineering",
  "TE": "Textile Engineering",
  "Arch": "Architecture",
  "IPE": "Industrial and Production Engineering",
  "ChE": "Chemical Engineering",
  "FE": "Food Engineering",
  "MME": "Materials and Metallurgical Engineering"
};

export const DEPARTMENT_LIST = Object.entries(DEPARTMENTS).map(([abbr, name]) => ({
  abbr,
  name
}));

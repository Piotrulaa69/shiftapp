export type Employee = {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarColor: string;
};

export type ShiftStatus = 'zaplanowana' | 'do_potwierdzenia' | 'potwierdzona' | 'urlop';

export type Shift = {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  startTime: string;
  endTime: string;
  day: string;
  location: string;
  status: ShiftStatus;
};

export type TaskPriority = 'wysoki' | 'normalny' | 'niski';
export type TaskStatus = 'do_zrobienia' | 'w_trakcie' | 'zamkniete';
export type ConfirmationType = 'photo' | 'values' | 'description';

export type Task = {
  id: string;
  title: string;
  description: string;
  assignedTime: string;
  completed: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  durationMin: number;
  confirmationType?: ConfirmationType;
};

export type Training = {
  id: string;
  title: string;
  category: string;
  durationMin: number;
  progressPercent: number;
  required: boolean;
  status: 'nierozpoczete' | 'w_toku' | 'ukonczone';
};

const getWeekDay = (offsetFromMonday: number): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offsetFromMonday);
  return monday.toISOString().split('T')[0];
};

export const currentUser = {
  id: '1',
  name: 'Anna Kowalska',
  firstName: 'Anna',
  role: 'Kierownik zmiany',
  email: 'anna.kowalska@firma.pl',
  initials: 'AK',
  avatarColor: '#4A7CF7',
  xpPoints: 1240,
  xpToday: 40,
  streakDays: 5,
  level: 'Starszy Barista',
  levelProgress: 65,
};

export const employees: Employee[] = [
  { id: '1', name: 'Anna Kowalska', role: 'Kierownik zmiany', initials: 'AK', avatarColor: '#4A7CF7' },
  { id: '2', name: 'Marek Nowak', role: 'Kelner', initials: 'MN', avatarColor: '#22C55E' },
  { id: '3', name: 'Karolina Wiśniewska', role: 'Kucharz', initials: 'KW', avatarColor: '#F97316' },
  { id: '4', name: 'Piotr Dąbrowski', role: 'Kelner', initials: 'PD', avatarColor: '#A855F7' },
  { id: '5', name: 'Aleksandra Lewandowska', role: 'Barista', initials: 'AL', avatarColor: '#EAB308' },
  { id: '6', name: 'Tomasz Zieliński', role: 'Kucharz', initials: 'TZ', avatarColor: '#EF4444' },
  { id: '7', name: 'Michał Nowicki', role: 'Lider zmiany', initials: 'MN', avatarColor: '#0F172A' },
];

export const shifts: Shift[] = [
  { id: 's1', employeeId: '1', employeeName: 'Anna Kowalska', role: 'Kierownik zmiany', startTime: '14:00', endTime: '22:00', day: getWeekDay(0), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's2', employeeId: '2', employeeName: 'Marek Nowak', role: 'Kelner', startTime: '10:00', endTime: '18:00', day: getWeekDay(0), location: 'Cafe Centrum', status: 'potwierdzona' },
  { id: 's3', employeeId: '3', employeeName: 'Karolina Wiśniewska', role: 'Kucharz', startTime: '08:00', endTime: '16:00', day: getWeekDay(0), location: 'Kuchnia Główna', status: 'potwierdzona' },
  { id: 's4', employeeId: '4', employeeName: 'Piotr Dąbrowski', role: 'Kelner', startTime: '12:00', endTime: '20:00', day: getWeekDay(0), location: 'Cafe Centrum', status: 'do_potwierdzenia' },

  { id: 's5', employeeId: '1', employeeName: 'Anna Kowalska', role: 'Kierownik zmiany', startTime: '08:00', endTime: '16:00', day: getWeekDay(1), location: 'Cafe Centrum', status: 'do_potwierdzenia' },
  { id: 's6', employeeId: '3', employeeName: 'Karolina Wiśniewska', role: 'Kucharz', startTime: '08:00', endTime: '16:00', day: getWeekDay(1), location: 'Kuchnia Główna', status: 'potwierdzona' },
  { id: 's7', employeeId: '6', employeeName: 'Tomasz Zieliński', role: 'Kucharz', startTime: '14:00', endTime: '22:00', day: getWeekDay(1), location: 'Kuchnia Główna', status: 'zaplanowana' },

  { id: 's8', employeeId: '2', employeeName: 'Marek Nowak', role: 'Kelner', startTime: '10:00', endTime: '18:00', day: getWeekDay(2), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's9', employeeId: '4', employeeName: 'Piotr Dąbrowski', role: 'Kelner', startTime: '12:00', endTime: '20:00', day: getWeekDay(2), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's10', employeeId: '5', employeeName: 'Aleksandra Lewandowska', role: 'Barista', startTime: '06:00', endTime: '14:00', day: getWeekDay(2), location: 'Bar Kawowy', status: 'zaplanowana' },

  { id: 's11', employeeId: '1', employeeName: 'Anna Kowalska', role: 'Kierownik zmiany', startTime: '14:00', endTime: '22:00', day: getWeekDay(3), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's12', employeeId: '3', employeeName: 'Karolina Wiśniewska', role: 'Kucharz', startTime: '08:00', endTime: '16:00', day: getWeekDay(3), location: 'Kuchnia Główna', status: 'zaplanowana' },
  { id: 's13', employeeId: '7', employeeName: 'Michał Nowicki', role: 'Lider zmiany', startTime: '14:00', endTime: '22:00', day: getWeekDay(3), location: 'Cafe Centrum', status: 'potwierdzona' },

  { id: 's14', employeeId: '2', employeeName: 'Marek Nowak', role: 'Kelner', startTime: '10:00', endTime: '18:00', day: getWeekDay(4), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's15', employeeId: '4', employeeName: 'Piotr Dąbrowski', role: 'Kelner', startTime: '12:00', endTime: '20:00', day: getWeekDay(4), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's16', employeeId: '5', employeeName: 'Aleksandra Lewandowska', role: 'Barista', startTime: 'URLOP', endTime: '', day: getWeekDay(4), location: '', status: 'urlop' },

  { id: 's17', employeeId: '6', employeeName: 'Tomasz Zieliński', role: 'Kucharz', startTime: '10:00', endTime: '18:00', day: getWeekDay(5), location: 'Kuchnia Główna', status: 'zaplanowana' },
  { id: 's18', employeeId: '2', employeeName: 'Marek Nowak', role: 'Kelner', startTime: '12:00', endTime: '20:00', day: getWeekDay(5), location: 'Cafe Centrum', status: 'zaplanowana' },

  { id: 's19', employeeId: '3', employeeName: 'Karolina Wiśniewska', role: 'Kucharz', startTime: '09:00', endTime: '17:00', day: getWeekDay(6), location: 'Kuchnia Główna', status: 'zaplanowana' },
  { id: 's20', employeeId: '4', employeeName: 'Piotr Dąbrowski', role: 'Kelner', startTime: '13:00', endTime: '21:00', day: getWeekDay(6), location: 'Cafe Centrum', status: 'zaplanowana' },
];

export const tasks: Task[] = [
  { id: 't1', title: 'Przygotowanie ekspresu', description: 'Uruchom i skalibruj ekspres do kawy przed otwarciem. Wykonaj zdjęcie gotowej stacji kawowej.', assignedTime: '08:00', completed: false, priority: 'wysoki', status: 'w_trakcie', durationMin: 15, confirmationType: 'photo' },
  { id: 't2', title: 'Inwentaryzacja Sektora B2', description: 'Sprawdzenie stanów magazynowych na regałach od 10 do 25. Wymagane zdjęcia.', assignedTime: '15:30', completed: false, priority: 'wysoki', status: 'do_zrobienia', durationMin: 60, confirmationType: 'photo' },
  { id: 't8', title: 'Kontrola temperatur w lodówkach', description: 'Codzienna kontrola temperatur wszystkich urządzeń chłodniczych zgodnie z procedurą HACCP.', assignedTime: '07:00', completed: false, priority: 'wysoki', status: 'w_trakcie', durationMin: 20, confirmationType: 'values' },
  { id: 't3', title: 'Przygotowanie palet do wysyłki', description: 'Zabezpieczenie folią stretch 5 palet dla klienta XYZ.', assignedTime: '17:00', completed: false, priority: 'normalny', status: 'do_zrobienia', durationMin: 45 },
  { id: 't7', title: 'Kontakt z dostawcą warzyw', description: 'Potwierdzenie zamówienia na poniedziałek. Opisz ustalenia z rozmowy.', assignedTime: '14:00', completed: false, priority: 'normalny', status: 'do_zrobienia', durationMin: 15, confirmationType: 'description' },
  { id: 't4', title: 'Uzupełnienie witryny', description: 'Uzupełnij witrynę chłodniczą o produkty z zaplecza.', assignedTime: '09:30', completed: true, priority: 'normalny', status: 'zamkniete', durationMin: 20 },
  { id: 't5', title: 'Sprawdzenie ekspresu', description: 'Codzienna kontrola i czyszczenie ekspresu.', assignedTime: '07:30', completed: true, priority: 'niski', status: 'zamkniete', durationMin: 10 },
  { id: 't6', title: 'Aktualizacja tablicy specjałów', description: 'Wpisz dzisiejsze dania dnia na tablicę kredową.', assignedTime: '08:30', completed: true, priority: 'niski', status: 'zamkniete', durationMin: 10 },
];

export const trainings: Training[] = [
  { id: 'tr1', title: 'Podstawowe zasady bezpieczeństwa na magazynie', category: 'BHP', durationMin: 45, progressPercent: 60, required: true, status: 'w_toku' },
  { id: 'tr2', title: 'Obsługa kasy fiskalnej', category: 'Procedury', durationMin: 30, progressPercent: 100, required: true, status: 'ukonczone' },
  { id: 'tr3', title: 'Standardy obsługi klienta', category: 'Obsługa', durationMin: 60, progressPercent: 0, required: true, status: 'nierozpoczete' },
  { id: 'tr4', title: 'Przygotowanie kawy espresso', category: 'Barista', durationMin: 45, progressPercent: 0, required: false, status: 'nierozpoczete' },
  { id: 'tr5', title: 'HACCP – higiena żywności', category: 'BHP', durationMin: 90, progressPercent: 30, required: true, status: 'w_toku' },
];

export const todayShift = {
  startTime: '14:00',
  endTime: '22:00',
  location: 'Cafe Centrum',
  leader: 'Michał N.',
  status: 'zaplanowana' as ShiftStatus,
};

export const roleColors: Record<string, string> = {
  'Kierownik zmiany': '#4A7CF7',
  'Lider zmiany': '#4A7CF7',
  Kelner: '#22C55E',
  Kucharz: '#F97316',
  Barista: '#EAB308',
  Hostessa: '#A855F7',
};

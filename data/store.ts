/**
 * ShiftApp Multi-Tenant Store
 *
 * Simulates a backend with full restaurant isolation.
 * Every query is scoped to a restaurantId — users of Restaurant A
 * can never see data from Restaurant B.
 */

export type UserRole = 'owner' | 'employee';

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string;
  ownerId: string;
  plan: 'basic' | 'premium';
  createdAt: string;
  logoColor: string;
};

export type AppUser = {
  id: string;
  email: string;
  password: string; // mock — plain text for demo
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
  role: UserRole;
  jobTitle: string;
  restaurantId: string;
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
};

export type Invitation = {
  id: string;
  restaurantId: string;
  code: string; // 6-char code, e.g. "CAFE47"
  createdBy: string;
  jobTitle: string;
  expiresAt: string;
  used: boolean;
  usedBy?: string;
};

export type ShiftStatus = 'zaplanowana' | 'do_potwierdzenia' | 'potwierdzona' | 'urlop';
export type TaskPriority = 'wysoki' | 'normalny' | 'niski';
export type TaskStatus = 'do_zrobienia' | 'w_trakcie' | 'zamkniete';
export type ConfirmationType = 'photo' | 'values' | 'description';

export type Shift = {
  id: string;
  restaurantId: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  startTime: string;
  endTime: string;
  day: string;
  location: string;
  status: ShiftStatus;
};

export type Task = {
  id: string;
  restaurantId: string;
  assignedTo: string;
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
  restaurantId: string;
  title: string;
  category: string;
  durationMin: number;
  progressPercent: number;
  required: boolean;
  status: 'nierozpoczete' | 'w_toku' | 'ukonczone';
};

// ────────────────── Helpers ──────────────────

const genId = () => Math.random().toString(36).slice(2, 10);

const genCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const getWeekDay = (offset: number): string => {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const d = new Date(now);
  d.setDate(now.getDate() + diffToMon + offset);
  return d.toISOString().split('T')[0];
};

const initials = (first: string, last: string) =>
  `${first[0]}${last[0]}`.toUpperCase();

// ────────────────── Seed Data ──────────────────

const RESTAURANTS: Restaurant[] = [
  {
    id: 'r1',
    name: 'Cafe Centrum',
    address: 'ul. Marszałkowska 12, Warszawa',
    phone: '+48 22 123 4567',
    ownerId: 'u1',
    plan: 'premium',
    createdAt: '2025-01-15',
    logoColor: '#4A7CF7',
  },
  {
    id: 'r2',
    name: 'Pizzeria Roma',
    address: 'ul. Długa 45, Kraków',
    phone: '+48 12 987 6543',
    ownerId: 'u10',
    plan: 'basic',
    createdAt: '2025-03-01',
    logoColor: '#F97316',
  },
];

const USERS: AppUser[] = [
  // ── Cafe Centrum ──
  { id: 'u1', email: 'anna@cafe.pl', password: 'demo', firstName: 'Anna', lastName: 'Kowalska', name: 'Anna Kowalska', initials: 'AK', role: 'owner', jobTitle: 'Kierownik zmiany', restaurantId: 'r1', avatarColor: '#4A7CF7', isActive: true, createdAt: '2025-01-15' },
  { id: 'u2', email: 'marek@cafe.pl', password: 'demo', firstName: 'Marek', lastName: 'Nowak', name: 'Marek Nowak', initials: 'MN', role: 'employee', jobTitle: 'Kelner', restaurantId: 'r1', avatarColor: '#22C55E', isActive: true, createdAt: '2025-01-20' },
  { id: 'u3', email: 'karolina@cafe.pl', password: 'demo', firstName: 'Karolina', lastName: 'Wiśniewska', name: 'Karolina Wiśniewska', initials: 'KW', role: 'employee', jobTitle: 'Kucharz', restaurantId: 'r1', avatarColor: '#F97316', isActive: true, createdAt: '2025-02-01' },
  { id: 'u4', email: 'piotr@cafe.pl', password: 'demo', firstName: 'Piotr', lastName: 'Dąbrowski', name: 'Piotr Dąbrowski', initials: 'PD', role: 'employee', jobTitle: 'Kelner', restaurantId: 'r1', avatarColor: '#A855F7', isActive: true, createdAt: '2025-02-10' },
  { id: 'u5', email: 'ola@cafe.pl', password: 'demo', firstName: 'Aleksandra', lastName: 'Lewandowska', name: 'Aleksandra Lewandowska', initials: 'AL', role: 'employee', jobTitle: 'Barista', restaurantId: 'r1', avatarColor: '#EAB308', isActive: true, createdAt: '2025-02-15' },
  // ── Pizzeria Roma ──
  { id: 'u10', email: 'tomasz@roma.pl', password: 'demo', firstName: 'Tomasz', lastName: 'Zieliński', name: 'Tomasz Zieliński', initials: 'TZ', role: 'owner', jobTitle: 'Właściciel', restaurantId: 'r2', avatarColor: '#EF4444', isActive: true, createdAt: '2025-03-01' },
  { id: 'u11', email: 'michal@roma.pl', password: 'demo', firstName: 'Michał', lastName: 'Nowicki', name: 'Michał Nowicki', initials: 'MN', role: 'employee', jobTitle: 'Pizzaiolo', restaurantId: 'r2', avatarColor: '#0F172A', isActive: true, createdAt: '2025-03-05' },
  { id: 'u12', email: 'kasia@roma.pl', password: 'demo', firstName: 'Katarzyna', lastName: 'Maj', name: 'Katarzyna Maj', initials: 'KM', role: 'employee', jobTitle: 'Kelnerka', restaurantId: 'r2', avatarColor: '#A855F7', isActive: true, createdAt: '2025-03-10' },
  { id: 'u13', email: 'jan@roma.pl', password: 'demo', firstName: 'Jan', lastName: 'Kowalczyk', name: 'Jan Kowalczyk', initials: 'JK', role: 'employee', jobTitle: 'Kucharz', restaurantId: 'r2', avatarColor: '#22C55E', isActive: true, createdAt: '2025-03-12' },
];

const SHIFTS: Shift[] = [
  // ── Cafe Centrum (r1) ──
  { id: 's1', restaurantId: 'r1', employeeId: 'u1', employeeName: 'Anna Kowalska', jobTitle: 'Kierownik zmiany', startTime: '14:00', endTime: '22:00', day: getWeekDay(0), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's2', restaurantId: 'r1', employeeId: 'u2', employeeName: 'Marek Nowak', jobTitle: 'Kelner', startTime: '10:00', endTime: '18:00', day: getWeekDay(0), location: 'Cafe Centrum', status: 'potwierdzona' },
  { id: 's3', restaurantId: 'r1', employeeId: 'u3', employeeName: 'Karolina Wiśniewska', jobTitle: 'Kucharz', startTime: '08:00', endTime: '16:00', day: getWeekDay(0), location: 'Kuchnia Główna', status: 'potwierdzona' },
  { id: 's4', restaurantId: 'r1', employeeId: 'u4', employeeName: 'Piotr Dąbrowski', jobTitle: 'Kelner', startTime: '12:00', endTime: '20:00', day: getWeekDay(0), location: 'Cafe Centrum', status: 'do_potwierdzenia' },
  { id: 's5', restaurantId: 'r1', employeeId: 'u1', employeeName: 'Anna Kowalska', jobTitle: 'Kierownik zmiany', startTime: '08:00', endTime: '16:00', day: getWeekDay(1), location: 'Cafe Centrum', status: 'do_potwierdzenia' },
  { id: 's6', restaurantId: 'r1', employeeId: 'u3', employeeName: 'Karolina Wiśniewska', jobTitle: 'Kucharz', startTime: '08:00', endTime: '16:00', day: getWeekDay(1), location: 'Kuchnia Główna', status: 'potwierdzona' },
  { id: 's7', restaurantId: 'r1', employeeId: 'u5', employeeName: 'Aleksandra Lewandowska', jobTitle: 'Barista', startTime: '06:00', endTime: '14:00', day: getWeekDay(1), location: 'Bar Kawowy', status: 'zaplanowana' },
  { id: 's8', restaurantId: 'r1', employeeId: 'u2', employeeName: 'Marek Nowak', jobTitle: 'Kelner', startTime: '10:00', endTime: '18:00', day: getWeekDay(2), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's9', restaurantId: 'r1', employeeId: 'u4', employeeName: 'Piotr Dąbrowski', jobTitle: 'Kelner', startTime: '12:00', endTime: '20:00', day: getWeekDay(2), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's10', restaurantId: 'r1', employeeId: 'u1', employeeName: 'Anna Kowalska', jobTitle: 'Kierownik zmiany', startTime: '14:00', endTime: '22:00', day: getWeekDay(3), location: 'Cafe Centrum', status: 'zaplanowana' },
  { id: 's11', restaurantId: 'r1', employeeId: 'u5', employeeName: 'Aleksandra Lewandowska', jobTitle: 'Barista', startTime: 'URLOP', endTime: '', day: getWeekDay(4), location: '', status: 'urlop' },
  // ── Pizzeria Roma (r2) ──
  { id: 's20', restaurantId: 'r2', employeeId: 'u10', employeeName: 'Tomasz Zieliński', jobTitle: 'Właściciel', startTime: '10:00', endTime: '22:00', day: getWeekDay(0), location: 'Pizzeria Roma', status: 'potwierdzona' },
  { id: 's21', restaurantId: 'r2', employeeId: 'u11', employeeName: 'Michał Nowicki', jobTitle: 'Pizzaiolo', startTime: '11:00', endTime: '19:00', day: getWeekDay(0), location: 'Kuchnia', status: 'potwierdzona' },
  { id: 's22', restaurantId: 'r2', employeeId: 'u12', employeeName: 'Katarzyna Maj', jobTitle: 'Kelnerka', startTime: '12:00', endTime: '20:00', day: getWeekDay(0), location: 'Sala główna', status: 'zaplanowana' },
  { id: 's23', restaurantId: 'r2', employeeId: 'u13', employeeName: 'Jan Kowalczyk', jobTitle: 'Kucharz', startTime: '10:00', endTime: '18:00', day: getWeekDay(0), location: 'Kuchnia', status: 'do_potwierdzenia' },
  { id: 's24', restaurantId: 'r2', employeeId: 'u11', employeeName: 'Michał Nowicki', jobTitle: 'Pizzaiolo', startTime: '11:00', endTime: '19:00', day: getWeekDay(1), location: 'Kuchnia', status: 'zaplanowana' },
  { id: 's25', restaurantId: 'r2', employeeId: 'u12', employeeName: 'Katarzyna Maj', jobTitle: 'Kelnerka', startTime: '14:00', endTime: '22:00', day: getWeekDay(1), location: 'Sala główna', status: 'zaplanowana' },
];

const TASKS: Task[] = [
  // ── Cafe Centrum (r1) ──
  { id: 't1', restaurantId: 'r1', assignedTo: 'u1', title: 'Przygotowanie ekspresu', description: 'Uruchom i skalibruj ekspres do kawy przed otwarciem. Wykonaj zdjęcie gotowej stacji kawowej.', assignedTime: '08:00', completed: false, priority: 'wysoki', status: 'w_trakcie', durationMin: 15, confirmationType: 'photo' },
  { id: 't2', restaurantId: 'r1', assignedTo: 'u2', title: 'Inwentaryzacja Sektora B2', description: 'Sprawdzenie stanów magazynowych na regałach od 10 do 25. Wymagane zdjęcia.', assignedTime: '15:30', completed: false, priority: 'wysoki', status: 'do_zrobienia', durationMin: 60, confirmationType: 'photo' },
  { id: 't8', restaurantId: 'r1', assignedTo: 'u3', title: 'Kontrola temperatur w lodówkach', description: 'Codzienna kontrola temperatur wszystkich urządzeń chłodniczych zgodnie z procedurą HACCP.', assignedTime: '07:00', completed: false, priority: 'wysoki', status: 'w_trakcie', durationMin: 20, confirmationType: 'values' },
  { id: 't3', restaurantId: 'r1', assignedTo: 'u4', title: 'Przygotowanie palet do wysyłki', description: 'Zabezpieczenie folią stretch 5 palet dla klienta XYZ.', assignedTime: '17:00', completed: false, priority: 'normalny', status: 'do_zrobienia', durationMin: 45 },
  { id: 't7', restaurantId: 'r1', assignedTo: 'u2', title: 'Kontakt z dostawcą warzyw', description: 'Potwierdzenie zamówienia na poniedziałek. Opisz ustalenia z rozmowy.', assignedTime: '14:00', completed: false, priority: 'normalny', status: 'do_zrobienia', durationMin: 15, confirmationType: 'description' },
  { id: 't4', restaurantId: 'r1', assignedTo: 'u5', title: 'Uzupełnienie witryny', description: 'Uzupełnij witrynę chłodniczą o produkty z zaplecza.', assignedTime: '09:30', completed: true, priority: 'normalny', status: 'zamkniete', durationMin: 20 },
  { id: 't5', restaurantId: 'r1', assignedTo: 'u1', title: 'Sprawdzenie ekspresu', description: 'Codzienna kontrola i czyszczenie ekspresu.', assignedTime: '07:30', completed: true, priority: 'niski', status: 'zamkniete', durationMin: 10 },
  // ── Pizzeria Roma (r2) ──
  { id: 't20', restaurantId: 'r2', assignedTo: 'u11', title: 'Przygotowanie ciasta', description: 'Wyrobić i podzielić ciasto na 40 porcji. Pozostawić do wyrośnięcia.', assignedTime: '09:00', completed: false, priority: 'wysoki', status: 'w_trakcie', durationMin: 45, confirmationType: 'photo' },
  { id: 't21', restaurantId: 'r2', assignedTo: 'u13', title: 'Kontrola temperatur', description: 'Sprawdzenie temperatur w lodówkach i zamrażarce.', assignedTime: '08:00', completed: false, priority: 'wysoki', status: 'do_zrobienia', durationMin: 15, confirmationType: 'values' },
  { id: 't22', restaurantId: 'r2', assignedTo: 'u12', title: 'Przygotowanie sali', description: 'Rozstawienie stolików, czyszczenie menu, zapalenie świec.', assignedTime: '11:00', completed: false, priority: 'normalny', status: 'do_zrobienia', durationMin: 30, confirmationType: 'description' },
  { id: 't23', restaurantId: 'r2', assignedTo: 'u10', title: 'Zamówienie mozzarelli', description: 'Zamówienie 10kg mozzarelli di bufala u dostawcy.', assignedTime: '10:00', completed: true, priority: 'normalny', status: 'zamkniete', durationMin: 10 },
];

const TRAININGS: Training[] = [
  // ── Cafe Centrum (r1) ──
  { id: 'tr1', restaurantId: 'r1', title: 'Podstawowe zasady BHP', category: 'BHP', durationMin: 45, progressPercent: 60, required: true, status: 'w_toku' },
  { id: 'tr2', restaurantId: 'r1', title: 'Obsługa kasy fiskalnej', category: 'Procedury', durationMin: 30, progressPercent: 100, required: true, status: 'ukonczone' },
  { id: 'tr3', restaurantId: 'r1', title: 'Standardy obsługi klienta', category: 'Obsługa', durationMin: 60, progressPercent: 0, required: true, status: 'nierozpoczete' },
  { id: 'tr4', restaurantId: 'r1', title: 'Przygotowanie kawy espresso', category: 'Barista', durationMin: 45, progressPercent: 0, required: false, status: 'nierozpoczete' },
  { id: 'tr5', restaurantId: 'r1', title: 'HACCP – higiena żywności', category: 'BHP', durationMin: 90, progressPercent: 30, required: true, status: 'w_toku' },
  // ── Pizzeria Roma (r2) ──
  { id: 'tr10', restaurantId: 'r2', title: 'Obsługa pieca do pizzy', category: 'Kuchnia', durationMin: 60, progressPercent: 100, required: true, status: 'ukonczone' },
  { id: 'tr11', restaurantId: 'r2', title: 'HACCP – higiena żywności', category: 'BHP', durationMin: 90, progressPercent: 40, required: true, status: 'w_toku' },
  { id: 'tr12', restaurantId: 'r2', title: 'Standardy serwisu włoskiego', category: 'Obsługa', durationMin: 45, progressPercent: 0, required: false, status: 'nierozpoczete' },
];

const futureDate = new Date();
futureDate.setMonth(futureDate.getMonth() + 6);
const DEMO_EXPIRY = futureDate.toISOString();

const INVITATIONS: Invitation[] = [
  // Pre-seeded demo codes — always valid
  { id: 'inv1', restaurantId: 'r1', code: 'CAFE01', createdBy: 'u1', jobTitle: 'Kelner', expiresAt: DEMO_EXPIRY, used: false },
  { id: 'inv2', restaurantId: 'r1', code: 'CAFE02', createdBy: 'u1', jobTitle: 'Barista', expiresAt: DEMO_EXPIRY, used: false },
  { id: 'inv3', restaurantId: 'r2', code: 'ROMA01', createdBy: 'u10', jobTitle: 'Pizzaiolo', expiresAt: DEMO_EXPIRY, used: false },
  { id: 'inv4', restaurantId: 'r2', code: 'ROMA02', createdBy: 'u10', jobTitle: 'Kelner', expiresAt: DEMO_EXPIRY, used: false },
];

// ────────────────── Store Singleton ──────────────────

class AppStore {
  restaurants = [...RESTAURANTS];
  users = [...USERS];
  shifts = [...SHIFTS];
  tasks = [...TASKS];
  trainings = [...TRAININGS];
  invitations = [...INVITATIONS];

  // ─── Auth ───
  login(email: string, password: string): { user: AppUser; restaurant: Restaurant } | null {
    const user = this.users.find((u) => u.email === email && u.password === password && u.isActive);
    if (!user) return null;
    const restaurant = this.restaurants.find((r) => r.id === user.restaurantId);
    if (!restaurant) return null;
    return { user, restaurant };
  }

  // ─── Provisioning ───
  createRestaurant(data: {
    name: string;
    address: string;
    phone: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerFirstName: string;
    ownerLastName: string;
    plan: 'basic' | 'premium';
  }): { restaurant: Restaurant; owner: AppUser } {
    const restaurantId = genId();
    const ownerId = genId();

    const restaurant: Restaurant = {
      id: restaurantId,
      name: data.name,
      address: data.address,
      phone: data.phone,
      ownerId,
      plan: data.plan,
      createdAt: new Date().toISOString().split('T')[0],
      logoColor: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
    };

    const owner: AppUser = {
      id: ownerId,
      email: data.ownerEmail,
      password: data.ownerPassword,
      firstName: data.ownerFirstName,
      lastName: data.ownerLastName,
      name: `${data.ownerFirstName} ${data.ownerLastName}`,
      initials: initials(data.ownerFirstName, data.ownerLastName),
      role: 'owner',
      jobTitle: 'Właściciel',
      restaurantId,
      avatarColor: restaurant.logoColor,
      isActive: true,
      createdAt: restaurant.createdAt,
    };

    this.restaurants.push(restaurant);
    this.users.push(owner);
    return { restaurant, owner };
  }

  // ─── Invitations ───
  generateInvitation(restaurantId: string, createdBy: string, jobTitle: string): Invitation {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const inv: Invitation = {
      id: genId(),
      restaurantId,
      code: genCode(),
      createdBy,
      jobTitle,
      expiresAt: expires.toISOString(),
      used: false,
    };
    this.invitations.push(inv);
    return inv;
  }

  findInvitation(code: string): Invitation | null {
    const inv = this.invitations.find(
      (i) => i.code.toUpperCase() === code.toUpperCase() && !i.used
    );
    if (!inv) return null;
    if (new Date(inv.expiresAt) < new Date()) return null;
    return inv;
  }

  acceptInvitation(
    code: string,
    data: { firstName: string; lastName: string; email: string; password: string }
  ): { user: AppUser; restaurant: Restaurant } | null {
    const inv = this.findInvitation(code);
    if (!inv) return null;

    const restaurant = this.restaurants.find((r) => r.id === inv.restaurantId);
    if (!restaurant) return null;

    // Check if email already in use
    if (this.users.find((u) => u.email === data.email)) return null;

    const user: AppUser = {
      id: genId(),
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      initials: initials(data.firstName, data.lastName),
      role: 'employee',
      jobTitle: inv.jobTitle,
      restaurantId: inv.restaurantId,
      avatarColor: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    this.users.push(user);
    inv.used = true;
    inv.usedBy = user.id;
    return { user, restaurant };
  }

  // ─── Tenant-scoped queries ───
  getRestaurant(id: string): Restaurant | undefined {
    return this.restaurants.find((r) => r.id === id);
  }

  getEmployees(restaurantId: string): AppUser[] {
    return this.users.filter((u) => u.restaurantId === restaurantId && u.isActive);
  }

  getShifts(restaurantId: string): Shift[] {
    return this.shifts.filter((s) => s.restaurantId === restaurantId);
  }

  getTasks(restaurantId: string): Task[] {
    return this.tasks.filter((t) => t.restaurantId === restaurantId);
  }

  getTrainings(restaurantId: string): Training[] {
    return this.trainings.filter((t) => t.restaurantId === restaurantId);
  }

  getInvitations(restaurantId: string): Invitation[] {
    return this.invitations.filter((i) => i.restaurantId === restaurantId);
  }

  // ─── Mutations (tenant-scoped) ───
  toggleTask(restaurantId: string, taskId: string): Task | null {
    const task = this.tasks.find((t) => t.id === taskId && t.restaurantId === restaurantId);
    if (!task) return null;
    task.completed = !task.completed;
    task.status = task.completed ? 'zamkniete' : 'do_zrobienia';
    return task;
  }

  removeEmployee(restaurantId: string, userId: string): boolean {
    const user = this.users.find((u) => u.id === userId && u.restaurantId === restaurantId);
    if (!user || user.role === 'owner') return false;
    user.isActive = false;
    return true;
  }

  getTodayShift(restaurantId: string, userId: string): { startTime: string; endTime: string; location: string; leader: string; status: ShiftStatus } | null {
    const today = new Date().toISOString().split('T')[0];
    const shift = this.shifts.find(
      (s) => s.restaurantId === restaurantId && s.employeeId === userId && s.day === today
    );
    if (!shift) {
      // Return first shift of the week for demo
      const anyShift = this.shifts.find(
        (s) => s.restaurantId === restaurantId && s.employeeId === userId
      );
      if (!anyShift) return null;
      const owner = this.users.find((u) => u.restaurantId === restaurantId && u.role === 'owner');
      return {
        startTime: anyShift.startTime,
        endTime: anyShift.endTime,
        location: anyShift.location,
        leader: owner ? `${owner.firstName} ${owner.lastName[0]}.` : 'N/A',
        status: anyShift.status,
      };
    }
    const owner = this.users.find((u) => u.restaurantId === restaurantId && u.role === 'owner');
    return {
      startTime: shift.startTime,
      endTime: shift.endTime,
      location: shift.location,
      leader: owner ? `${owner.firstName} ${owner.lastName[0]}.` : 'N/A',
      status: shift.status,
    };
  }
}

// Singleton
export const store = new AppStore();

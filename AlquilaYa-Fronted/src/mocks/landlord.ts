export interface LandlordContract {
  id: string;
  studentName: string;
  roomName: string;
  startDate: string;
  endDate: string;
  status: 'firmado' | 'pendiente' | 'expirado';
  pdfUrl?: string;
}

export interface StudentReview {
  id: string;
  studentName: string;
  roomName: string;
  rating: number;
  comment: string;
  date: string;
  reply?: string;
}

export const LANDLORD_CONTRACTS: LandlordContract[] = [
  { id: '1', studentName: 'Juan Pérez', roomName: 'Habitación Premium Surco', startDate: '2024-03-01', endDate: '2024-12-31', status: 'firmado' },
  { id: '2', studentName: 'María García', roomName: 'Studio San Isidro', startDate: '2024-04-15', endDate: '2025-04-14', status: 'pendiente' },
  { id: '3', studentName: 'Roberto L.', roomName: 'Habitación Miraflores', startDate: '2023-01-01', endDate: '2023-12-31', status: 'expirado' },
];

export const LANDLORD_REVIEWS: StudentReview[] = [
  { id: '1', studentName: 'Ana Torres', roomName: 'Habitación Premium Surco', rating: 5, comment: 'Excelente ambiente y el dueño es muy amable. El cuarto estaba impecable.', date: 'Hace 2 días' },
  { id: '2', studentName: 'Diego R.', roomName: 'Studio San Isidro', rating: 4, comment: 'Muy buena ubicación. Solo tuve un pequeño problema con el Wi-Fi pero se solucionó rápido.', date: 'Hace 1 semana', reply: 'Gracias Diego, ya reforzamos el router de esa zona.' },
];

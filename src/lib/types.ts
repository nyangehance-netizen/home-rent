export type Role = 'tenant' | 'owner' | 'broker';
export type ListingType = 'apartment' | 'house' | 'studio' | 'room';
export type ListingStatus = 'available' | 'occupied' | 'paused';
export type InquiryKind = 'viewing' | 'reservation';
export type InquiryStatus = 'open' | 'confirmed' | 'declined' | 'cancelled';
export type ClientStage = 'lead' | 'viewing' | 'agreed' | 'moved';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  broker_code: string | null;
};

export type Photo = {
  id: string;
  listing_id: string;
  path: string;
  caption: string;
  position: number;
};

export type Listing = {
  id: string;
  owner_id: string | null;
  broker_id: string | null;
  owner_name: string | null;
  title: string;
  type: ListingType;
  area: string;
  rent: number;
  advance_months: number;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  amenities: string[];
  description: string;
  status: ListingStatus;
  verified: boolean;
  created_at: string;
  listing_photos?: Photo[];
};

export type Payment = {
  id?: string;
  status: PaymentStatus;
  amount: number;
  provider?: string;
  provider_ref: string | null;
};

export type Inquiry = {
  id: string;
  listing_id: string;
  tenant_id: string;
  name: string;
  phone: string;
  kind: InquiryKind;
  preferred_date: string | null;
  message: string | null;
  broker_id: string | null;
  status: InquiryStatus;
  created_at: string;
  listing?: { title: string; area: string; rent: number } | null;
  broker?: { full_name: string } | null;
  payments?: Payment[];
};

export type BrokerClient = {
  id: string;
  name: string;
  phone: string;
  wants: string;
  listing_id: string | null;
  stage: ClientStage;
  created_at: string;
  listing?: { title: string; area: string; rent: number } | null;
};

export type Commission = {
  id: string;
  client_name: string;
  stage: ClientStage;
  listing_id: string;
  title: string;
  area: string;
  commission: number;
  state: 'earned' | 'pending';
  updated_at: string;
};

export const AREAS = [
  'Masaki',
  'Oyster Bay',
  'Mikocheni',
  'Msasani',
  'Mbezi Beach',
  'Kinondoni',
  'Sinza',
  'Upanga',
  'Kariakoo',
  'Ilala',
  'Kigamboni',
  'Tegeta',
  'Kimara',
  'Temeke',
] as const;

export const LISTING_TYPES: ListingType[] = ['apartment', 'house', 'studio', 'room'];
export const AMENITIES = ['water', 'power', 'guard', 'parking', 'ac', 'wifi', 'pool', 'garden', 'gate'] as const;
export const PHOTO_KINDS = ['exterior', 'living', 'bedroom', 'kitchen', 'bathroom', 'pool', 'photo'] as const;
export const STAGES: ClientStage[] = ['lead', 'viewing', 'agreed', 'moved'];
export const PROVIDERS = [
  { id: 'mpesa', name: 'M-Pesa', color: '#E1251B' },
  { id: 'mixx', name: 'Mixx by Yas', color: '#1E5BC6' },
  { id: 'airtel', name: 'Airtel Money', color: '#ED1C24' },
  { id: 'halopesa', name: 'HaloPesa', color: '#F7941D' },
] as const;

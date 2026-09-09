export type Role = 'musician' | 'organizer' | 'admin';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  title?: string;
  bio?: string;
  location?: string;
  genre?: string;
  instruments?: string[];
  tags?: string[];
  yearsExperience?: number;
  availability?: string;
  rate?: { currency: string; amount: number; unit: string };
  photoUrl?: string | null;
  epkUrl?: string | null;
  socials?: { instagram?: string; youtube?: string; website?: string } | null;
  createdAt?: string;
}

export interface Gig {
  id: string;
  title: string;
  description?: string;
  type?: string;
  venue: string;
  venueId?: string | null;
  location: string;
  date: string;
  startTime?: string;
  endTime?: string;
  fee?: { currency: string; amount: number };
  capacity?: number;
  status?: string;
  genre?: string;
  tags?: string[];
  requirements?: string;
  contractTerms?: string;
  cancellationPolicy?: string;
  depositPercent?: number;
  hostId?: string;
  hostName?: string;
  applicationCount?: number;
  createdAt?: string;
}

export interface Musician {
  id: string;
  name: string;
  title: string;
  bio?: string;
  location?: string;
  genre?: string;
  instruments?: string[];
  tags?: string[];
  yearsExperience?: number;
  availability?: string;
  rate?: { currency: string; amount: number; unit: string };
  photoUrl?: string | null;
  averageRating?: number;
  createdAt?: string;
}

export interface Application {
  id: string;
  gigId: string;
  musicianId: string;
  musicianName: string;
  email: string;
  phone?: string;
  note?: string;
  status: 'pending' | 'accepted' | 'declined';
  gig?: Gig | null;
  musician?: Musician | null;
  createdAt?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author?: { id: string; name: string; role: string; photoUrl?: string | null } | null;
  bandId?: string | null;
  band?: { id: string; name: string } | null;
  type: 'post' | 'recruit';
  title?: string;
  body: string;
  link?: string;
  topic?: string;
  genre?: string;
  location?: string;
  instrument?: string;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  createdAt?: string;
}

export interface Band {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  location?: string;
  photoUrl?: string | null;
  ownerId?: string;
  memberCount?: number;
  membershipRole?: string;
  membershipStatus?: string;
}

export interface Venue {
  id: string;
  name: string;
  type?: string;
  description?: string;
  location: string;
  capacity?: number;
  amenities?: string;
  photoUrl?: string | null;
  website?: string;
  phone?: string;
  contactEmail?: string;
  ownerId?: string;
  gigCount?: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt?: string;
}

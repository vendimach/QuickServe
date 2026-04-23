import type { Category, Service, Professional, PartnerRequest, Review } from "@/types";

export const categories: Category[] = [
  {
    id: "elder-care",
    name: "Elder Care",
    icon: "HeartPulse",
    color: "primary",
    description: "Compassionate care for seniors",
  },
  {
    id: "babysitter",
    name: "Babysitter",
    icon: "Baby",
    color: "accent",
    description: "Trusted childcare at home",
  },
  {
    id: "housemaid",
    name: "Housemaid",
    icon: "Sparkles",
    color: "warning",
    description: "Cleaning & household help",
  },
  {
    id: "pet-care",
    name: "Pet Care",
    icon: "PawPrint",
    color: "success",
    description: "Walks, sitting & grooming",
  },
];

export const services: Service[] = [
  {
    id: "s1",
    name: "Senior Day Companion",
    categoryId: "elder-care",
    price: 899,
    duration: "4 hrs",
    rating: 4.8,
    reviews: 3245,
    description: "Companionship, light assistance & meals",
    icon: "HeartPulse",
  },
  {
    id: "s2",
    name: "Trained Caregiver Visit",
    categoryId: "elder-care",
    price: 1299,
    duration: "6 hrs",
    rating: 4.7,
    reviews: 1820,
    description: "Medication reminders & mobility support",
    icon: "HeartPulse",
  },
  {
    id: "s3",
    name: "Evening Babysitter",
    categoryId: "babysitter",
    price: 499,
    duration: "3 hrs",
    rating: 4.9,
    reviews: 5621,
    description: "Background-verified, kid-friendly sitters",
    icon: "Baby",
  },
  {
    id: "s4",
    name: "Full-Day Nanny",
    categoryId: "babysitter",
    price: 1499,
    duration: "8 hrs",
    rating: 4.8,
    reviews: 2310,
    description: "Engaging activities & meal support",
    icon: "Baby",
  },
  {
    id: "s5",
    name: "Daily Housemaid",
    categoryId: "housemaid",
    price: 399,
    duration: "2 hrs",
    rating: 4.9,
    reviews: 18432,
    description: "Sweeping, mopping & dishwashing",
    icon: "Sparkles",
  },
  {
    id: "s6",
    name: "Deep Home Cleaning",
    categoryId: "housemaid",
    price: 1299,
    duration: "4 hrs",
    rating: 4.7,
    reviews: 6520,
    description: "Top-to-bottom cleaning of your home",
    icon: "Sparkles",
  },
  {
    id: "s7",
    name: "Dog Walking",
    categoryId: "pet-care",
    price: 299,
    duration: "45 min",
    rating: 4.8,
    reviews: 4230,
    description: "Daily walks by certified handlers",
    icon: "PawPrint",
  },
  {
    id: "s8",
    name: "Pet Sitting at Home",
    categoryId: "pet-care",
    price: 799,
    duration: "5 hrs",
    rating: 4.6,
    reviews: 1820,
    description: "Loving care while you're away",
    icon: "PawPrint",
  },
];

export const professionals: Professional[] = [
  {
    id: "p1", name: "Rahul Verma", rating: 4.9, jobs: 1240, avatar: "RV", eta: "8 min",
    categoryIds: ["elder-care", "housemaid"], availableNow: true, listedToday: true, distance: "1.2 km",
    bio: "8 yrs caring for seniors. First-aid certified.",
    schedule: [{ days: ["Mon","Wed","Fri"], start: "08:00", end: "14:00" }, { days: ["Tue","Thu"], start: "17:00", end: "22:00" }],
  },
  {
    id: "p2", name: "Priya Sharma", rating: 4.8, jobs: 980, avatar: "PS", eta: "12 min",
    categoryIds: ["babysitter", "elder-care"], availableNow: true, listedToday: true, distance: "2.4 km",
    bio: "Loving nanny — 5 yrs with toddlers.",
    schedule: [{ days: ["Mon","Tue","Wed","Thu","Fri"], start: "09:00", end: "18:00" }],
  },
  {
    id: "p3", name: "Amit Kumar", rating: 4.9, jobs: 1530, avatar: "AK", eta: "5 min",
    categoryIds: ["pet-care", "housemaid"], availableNow: true, listedToday: true, distance: "0.8 km",
    bio: "Pet handler & home cleaner.",
    schedule: [{ days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], start: "06:00", end: "20:00" }],
  },
  {
    id: "p4", name: "Neha Singh", rating: 4.7, jobs: 720, avatar: "NS", eta: "15 min",
    categoryIds: ["babysitter"], availableNow: false, listedToday: true, distance: "3.1 km",
    bio: "Evening sitter, fluent in 3 languages.",
    schedule: [{ days: ["Mon","Wed","Fri"], start: "17:00", end: "22:00" }],
  },
  {
    id: "p5", name: "Karan Mehta", rating: 4.8, jobs: 2100, avatar: "KM", eta: "10 min",
    categoryIds: ["housemaid", "pet-care"], availableNow: true, listedToday: true, distance: "1.9 km",
    bio: "Deep cleaning specialist.",
    schedule: [{ days: ["Tue","Thu","Sat"], start: "10:00", end: "19:00" }],
  },
  {
    id: "p6", name: "Suman Rao", rating: 4.9, jobs: 1840, avatar: "SR", eta: "20 min",
    categoryIds: ["elder-care"], availableNow: false, listedToday: true, distance: "4.0 km",
    bio: "Trained caregiver for elderly with mobility needs.",
    schedule: [{ days: ["Mon","Tue","Wed","Thu","Fri"], start: "08:00", end: "16:00" }],
  },
];

export const seedReviews: Review[] = [
  { id: "rv1", professionalId: "p1", bookingId: "seed", rating: 5, comment: "Very gentle with my grandmother. On time and respectful.", customerName: "Ananya G.", createdAt: new Date(Date.now() - 86400000 * 3), tags: ["Punctual", "Polite"] },
  { id: "rv2", professionalId: "p1", bookingId: "seed", rating: 5, comment: "Highly recommend Rahul.", customerName: "Vikram S.", createdAt: new Date(Date.now() - 86400000 * 10), tags: ["Caring"] },
  { id: "rv3", professionalId: "p2", bookingId: "seed", rating: 5, comment: "My toddler loved her!", customerName: "Meera K.", createdAt: new Date(Date.now() - 86400000 * 5), tags: ["Friendly", "Patient"] },
  { id: "rv4", professionalId: "p3", bookingId: "seed", rating: 5, comment: "My dog was so happy after the walk.", customerName: "Sneha P.", createdAt: new Date(Date.now() - 86400000 * 2), tags: ["Caring"] },
  { id: "rv5", professionalId: "p5", bookingId: "seed", rating: 4, comment: "Great deep cleaning, will book again.", customerName: "Rohan M.", createdAt: new Date(Date.now() - 86400000 * 7), tags: ["Thorough"] },
];

export const cancellationPolicy = {
  beforeAcceptFee: 0,
  afterAcceptFee: 50,
  withinArrivalFee: 150,
  rules: [
    "Free cancellation before a partner accepts your request.",
    "₹50 fine if cancelled after a partner accepts.",
    "₹150 fine if cancelled within 15 minutes of partner arrival.",
    "No fine if cancelled by partner or due to genuine emergencies.",
  ],
};

export const safetyInstructions: Record<string, string[]> = {
  "elder-care": [
    "Keep medication labels clearly visible.",
    "Lock away expensive jewellery & cash.",
    "Share emergency contact numbers with the caregiver.",
    "Keep walkways clear to prevent falls.",
  ],
  babysitter: [
    "Lock all almirahs & drawers with valuables.",
    "Keep childproof gates in place near stairs.",
    "Share allergy and food preference details.",
    "Keep emergency contacts on the fridge.",
  ],
  housemaid: [
    "Lock shelves and cabinets containing valuables.",
    "Stow away expensive electronics & jewellery.",
    "Inform about any fragile items in advance.",
    "Keep cleaning chemicals out of pet/child reach.",
  ],
  "pet-care": [
    "Share leash, food & medication clearly.",
    "Inform about pet allergies or behaviour quirks.",
    "Lock cabinets — pets are curious!",
    "Keep vet contact details handy.",
  ],
};

export const samplePartnerRequests: PartnerRequest[] = [
  {
    id: "r1",
    serviceName: "Senior Day Companion",
    customerName: "Ananya G.",
    distance: "1.2 km",
    price: 899,
    type: "instant",
    address: "Indiranagar, Bengaluru",
  },
  {
    id: "r2",
    serviceName: "Full-Day Nanny",
    customerName: "Rohan M.",
    distance: "2.8 km",
    price: 1499,
    type: "scheduled",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    address: "Koramangala, Bengaluru",
  },
  {
    id: "r3",
    serviceName: "Dog Walking",
    customerName: "Sneha P.",
    distance: "0.8 km",
    price: 299,
    type: "instant",
    address: "HSR Layout, Bengaluru",
  },
];
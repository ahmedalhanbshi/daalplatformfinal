import api from './api-client';

export interface PlatformStats {
  students: number;
  courses: number;
  trainers: number;
  institutes: number;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  _count: {
    courses: number;
  };
}

export interface FeaturedCourse {
  id: string;
  title: string;
  price: string;
  image: string | null;
  category: { id: string; name: string } | null;
  trainer: { id: string; name: string; avatar: string | null } | null;
  staffTrainer: { id: string; name: string } | null;
  institute: { id: string; name: string; logo: string | null } | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
}

export const PublicService = {
  // Get platform statistics
  getStats: async (): Promise<PlatformStats> => {
    const response = await api.get('/api/public/stats');
    return response.data.data;
  },

  // Get categories with their course counts
  getCategories: async (): Promise<CategoryData[]> => {
    const response = await api.get('/api/public/categories');
    return response.data.data;
  },

  // Get featured courses for homepage
  getFeaturedCourses: async (): Promise<FeaturedCourse[]> => {
    const response = await api.get('/api/public/featured-courses');
    return response.data.data;
  },

  // Get all available tags
  getTags: async (): Promise<Tag[]> => {
    const response = await api.get('/api/public/tags');
    return response.data.data;
  },
};


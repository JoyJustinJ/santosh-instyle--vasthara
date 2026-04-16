import { Scheme } from './types';

const defaultSchemes: Scheme[] = [];

const getStoredSchemes = (): Scheme[] => {
  return defaultSchemes;
};

export const SCHEMES: Scheme[] = getStoredSchemes();

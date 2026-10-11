// Breaks: apps never import each other (by package name and by path).
import { a } from '@smartapp/storefront';
import { b } from '../../storefront/src/features/cart/cart';

export const both = [a, b];

// Breaks: apps never import each other (by package name and by path).
import { a } from '@smartapp/dashboard';
import { b } from '../../dashboard/src/app/registry';

export const both = [a, b];

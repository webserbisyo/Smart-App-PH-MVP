// Breaks: dashboard features never import each other (relative, long relative and aliased).
import { a } from '../../orders/components/OrderCard';
import { b } from '../../../features/products/hooks/useItems';
import { c } from '@/features/customers/screens/CustomersScreen';
import { d } from '../components/HomeCard';

export const all = [a, b, c, d];

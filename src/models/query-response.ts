import { Triple } from './triple';

export interface QueryResponse {
    triples: Triple[];
    url: string;
    resourceFormat: string;
}

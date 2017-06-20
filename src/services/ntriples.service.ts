import { QueryResponse } from './../models/query-response';
import { TriplePart } from './../models/triple-part';
import { Triple } from '../models/triple';
import * as isUrl from 'is-url';

export class Ntriples {

    static getTriplesFromContent(content: string, uri: string) {

        let queryResponse: QueryResponse = {triples: [], uri: uri, resourceFormat: 'N-Triples'};
        let triples: Triple[] = [];
        let tripleLines: string[] = content.split('\n');

        for (let i = 0; i < tripleLines.length; i++) {
            if (tripleLines[i].length > 0) {
                let subject: string;
                let predicate: string;
                let object: string;

                let blankNodes: string[] = tripleLines[i].split('_:');
                if (blankNodes.length > 1) {
                    subject = '_:' + blankNodes[1].split(' ')[0];
                    if (blankNodes.length > 2)
                        object = '_:' + blankNodes[2].split(' ')[0];
                }

                tripleLines[i] = tripleLines[i].replace(/\\"/g, '§§§§');
                let quotedNodes: string[] = tripleLines[i].split('"');
                if (quotedNodes.length > 1)
                    object = quotedNodes[1].replace(/§§§§/g, '"');

                let angleBracketNodes: string[] = tripleLines[i].split('<');
                for (let j = 0; j < angleBracketNodes.length; j++) {
                    switch (j) {
                        case 1:
                            if (subject) predicate = angleBracketNodes[j].split('>')[0];
                            else subject = angleBracketNodes[j].split('>')[0];
                            break;
                        case 2:
                            if (predicate) object = angleBracketNodes[j].split('>')[0];
                            else predicate = angleBracketNodes[j].split('>')[0];
                            break;
                        case 3:
                            if (!object) object = angleBracketNodes[j].split('>')[0];
                            break;
                    }
                }

                triples.push({
                    subject: this.getTriplePart(subject),
                    predicate: this.getTriplePart(predicate),
                    object: this.getTriplePart(object)
                });
            }
        }

        queryResponse.triples = triples;

        console.log('Processed ' + String(triples.length) + ' ' + queryResponse.resourceFormat + '-Items');

        return new Promise((resolve, reject) => resolve(queryResponse));
    }

    private static getTriplePart(text: string): TriplePart {
        let name: string = isUrl(text) ? text.split('/')[text.split('/').length - 1] : text;
        let uri: string = isUrl(text) ? text : null;
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }
}

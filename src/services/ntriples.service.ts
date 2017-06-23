import { QueryResponse } from './../models/query-response';
import { TriplePart } from './../models/triple-part';
import { Triple } from '../models/triple';
import * as isUrl from 'is-url';

/*
 * Ntriples-Class: Implements logic for extracting
 * n-triples from HTML-DOM.
 */

export class Ntriples {

    // Function called by request.service.ts - generateResponse()
    static getTriplesFromContent(content: string, uri: string) {

        /*
         * N-Triples (subject, predicate, object) can have the following appearance:
         * --------------------------------------------------------------------------
         *   <uri> <uri> <uri> .
         *   <uri> <uri> _:genidY .
         *   <uri> <uri> "Plaintext" .
         *   <uri> <uri> "Plaintext"^^<uri> .
         * _:genidX <uri> <uri> .
         * _:genidX <uri> _:genidY .
         * _:genidX <uri> "Plaintext" .
         * _:genidX <uri> "Plaintext"^^<uri> .
         */

        let queryResponse: QueryResponse = {triples: [], resourceFormat: 'N-Triple'};
        let triples: Triple[] = [];

        // Split content-string by "\n" (every new line is a triple).
        let tripleLines: string[] = content.split('\n');

        // Iterare array
        for (let i = 0; i < tripleLines.length; i++) {
            if (tripleLines[i].length > 0) {
                let subject: string;
                let predicate: string;
                let object: string;

                // Set subjetc and/or object if triple-string contains "_:"
                let blankNodes: string[] = tripleLines[i].split('_:');
                if (blankNodes.length > 1) {
                    if (blankNodes[0].length == 0) subject = '_:' + blankNodes[1].split(' ')[0];
                    else object = '_:' + blankNodes[1].split(' ')[0];
                    if (blankNodes.length > 2)
                        object = '_:' + blankNodes[2].split(' ')[0];
                }

                // Replace escaped quote signs with §§§§
                tripleLines[i] = tripleLines[i].replace(/\\"/g, '§§§§');

                // Set object if triple-string still contains quote signs.
                let quotedNodes: string[] = tripleLines[i].split('"');
                if (quotedNodes.length > 1)
                    object = quotedNodes[1].replace(/§§§§/g, '"');

                // Split triple-string by "<", set predicate [and subject and object (if null)].
                let angleBracketNodes: string[] = tripleLines[i].split('<');
                for (let j = 0; j < angleBracketNodes.length; j++) {
                    switch (j) {
                        case 1:
                            if (subject) predicate = angleBracketNodes[j].split('>')[0];
                            else subject = angleBracketNodes[j].split('>')[0];
                            break;
                        case 2:
                            if (predicate) {
                                if (!object) object = angleBracketNodes[j].split('>')[0];
                            } else predicate = angleBracketNodes[j].split('>')[0];
                            break;
                        case 3:
                            if (!object) object = angleBracketNodes[j].split('>')[0];
                            break;
                    }
                }

                // Push new triple to array.
                triples.push({
                    subject: this.getTriplePart(subject),
                    predicate: this.getTriplePart(predicate),
                    object: this.getTriplePart(object)
                });

                // If triple-string contains "^^" add uri to object.
                if (tripleLines[i].split('^^').length > 1)
                    triples[triples.length - 1].object.uri = tripleLines[i].split('^^')[1].split('<')[1].split('>')[0];
            }
        }

        // Add triples array to reponse.
        queryResponse.triples = triples;

        console.log('Processed ' + String(triples.length) + ' ' + queryResponse.resourceFormat + '-Items');

        return new Promise((resolve, reject) => resolve(queryResponse));
    }

    // Generates name and uri information.
    private static getTriplePart(text: string): TriplePart {
        let name: string = isUrl(text) ? text.split('/')[text.split('/').length - 1] : text;
        let uri: string = isUrl(text) ? text : null;
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }
}

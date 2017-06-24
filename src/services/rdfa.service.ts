import { QueryResponse } from './../models/query-response';
import { TriplePart } from './../models/triple-part';
import { Triple } from '../models/triple';
import * as isUrl from 'is-url';

/*
 * RDFaService-Class: Implements logic for extracting
 * RDFa-triples from HTML-DOM.
 */

export class RDFaService {

    // Function called by request.service.ts - generateResponse()
    static getTriplesFromDom(dom: any, uri: string) {

        let queryResponse: QueryResponse = {triples: [], resourceFormat: 'RDFa'};
        let triples: Triple[] = [];
        let vocabs = new Map<string, string>();
        let scopeCounter = 0;

        let parseOneNode = (nodes, _parent: Triple, _vocab: string) => {
            let parent: Triple = _parent;
            let currentVocab: string = _vocab;

             /*
             * For each node in current DOM-hierarchy that has the type "tag" (<tagname/>)
             * test if it has got an element like "property" or "typeof". If such an element
             * is found, generate new triple an push it to triples array. Furthermore look for
             * elements like "vocab" and "prefix" for managing the schema-vocabularies.
             */
            nodes.filter(n => n.type === 'tag').forEach(tag => {
                /*
                 * vocab found. If child-nodes properties do not contain a prefix they
                 * belong to this vocab.
                 */
                if (tag.attribs.hasOwnProperty('vocab')) {
                    currentVocab = tag.attribs.vocab;
                    /*
                     * If the node has got in addition the element "typeof", look for standard prefixes
                     * like "rdfs" and add them to the vocabs-dictionary. At the moment there is
                     * only a test for rdfs-prefix. TODO: Find more standard vocabs an its prefixes (RDF standard).
                     */
                    if (tag.attribs.hasOwnProperty('typeof') && tag.attribs.typeof.includes('rdfs:'))
                        vocabs.set('rdfs', currentVocab);
                }
                /*
                 * prefix found. Prefixes contain a prefix-name seperated by a ":" from vocab-information.
                 * This element sometimes provide more than one prefix. They are seperated by spaces. In some
                 * cases behind the ":" are spaces, too. In the following process every prefix found in the
                 * current node is added to the prefix dictionary.
                 */
                if (tag.attribs.hasOwnProperty('prefix')) {
                    // Replace "://" (from http://xxx.xxx.xxx) with "§§§§//" so that the left ":" are definately seperators and split by spaces.
                    let prefixes: string[] = tag.attribs.prefix.replace(/:\/\//g, '§§§§//').split(' ');
                    let currentPrefix = null;
                    // Split by ":", read prefix-name and vocab (replacing "§§§§" with ":") and add them to the dictionary.
                    for (let i = 0; i < prefixes.length; i++) {
                        if (prefixes[i].endsWith(':')) {
                            currentPrefix = prefixes[i].split(':')[0];
                        } else if (prefixes[i].split(':').length > 1) {
                            vocabs.set(prefixes[i].split(':')[0], prefixes[i].split(':')[1].replace('§§§§', ':'));
                        } else {
                            vocabs.set(currentPrefix, prefixes[i].replace('§§§§', ':'));
                        }
                    }
                }
                // property found (predicate). Belongs to a parent triple.
                if (tag.attribs.hasOwnProperty('property') && parent) {
                    triples.push({
                        subject: parent.subject,
                        predicate: this.getPredicate(currentVocab, vocabs, tag.attribs.property),
                        object: tag.attribs.hasOwnProperty('typeof') ? this.getObject(currentVocab, vocabs, tag, uri, scopeCounter) : this.getObject(currentVocab, vocabs, tag, uri)
                    });
                }
                // typeof found: new parent triple! This is the new parent triple of its children.
                if (tag.attribs.hasOwnProperty('typeof')) {
                    scopeCounter++;
                    triples.push({
                        subject: {name: '_:genid' + String(scopeCounter)},
                        predicate: {name: 'rdf-syntax-ns#type', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'},
                        object: this.getObject(currentVocab, vocabs, tag, uri)
                    });
                    parent = triples[triples.length - 1];
                }
                // If current node has got child-nodes call parseOneNode() recursively.
                if (tag.children) parseOneNode(tag.children, parent, currentVocab);
            });
        }

        // Start parsing DOM
        parseOneNode(dom, null, '');

        // Add triples array to reponse.
        queryResponse.triples = triples;

        console.log('Processed ' + String(triples.length) + ' ' + queryResponse.resourceFormat + '-Items');

        return new Promise((resolve, reject) => resolve(queryResponse));
    }

    // Returns the predicate of a triple with its name and uri as TriplePart.
    private static getPredicate(currentVocab: string, vocabs: Map<string, string>, property: string): TriplePart {
        let name: string = property;
        let uri: string = null;
        /*
         * If property is an url get the string behind the last slash for setting the predicates name and set uri = property.
         * If property starts with prefix, split information, search vocab in dictionary and generate url by combining
         * name and vocab. If property is not an url combine it with the last vocab-information.
         */
        if (isUrl(property)) {
            name = property.split('/')[property.split('/').length - 1];
            uri = property;
        } else if (property.split(':').length > 1) {
            // Replace the first space with an empty character because in some cases spaces are behind the colon.
            name = property.split(':')[1].replace(' ', '');
            uri = vocabs.get(property.split(':')[0]) + name;
        } else {
            uri = isUrl(currentVocab + property) ? currentVocab + property : null;
        }
        if (uri) return {name: name, uri: uri};
        else return {name: name};
    }

    // Returns the object of a triple with its name and uri as TriplePart.
    private static getObject(currentVocab: string, vocabs: Map<string, string>, tag: any, siteUri: string, scopeCounter?: number): TriplePart {
        let name: string;
        let uri = '';

        if (scopeCounter && scopeCounter > 0) {
            /*
             * If scopeCounter is not null and not 0 current object references a child triple.
             * New id of child triple = current id + 1
             */
            name = '_:genid' + String(scopeCounter + 1);
            uri = null;
        } else if (tag.attribs.hasOwnProperty('typeof')) {
            /*
             * If current tag contains "typeof" it is a new parent triple.
             * Object contains uri and name to rdf-syntax-ns#type.
             * Same logic like in getPredicate()-Function.
             */
            if (!isUrl(tag.attribs.typeof)) {
                if (tag.attribs.typeof.split(':').length > 1) {
                    name = tag.attribs.typeof.split(':')[1].replace(' ', '');
                    uri = vocabs.get(tag.attribs.typeof.split(':')[0]) + name;
                } else {
                    name = tag.attribs.typeof
                    uri = isUrl(currentVocab + tag.attribs.typeof) ? currentVocab + tag.attribs.typeof : null;
                }
            } else {
                name = tag.attribs.typeof.split('/')[tag.attribs.typeof.split('/').length - 1];
                uri = tag.attribs.typeof;
            }
        } else {
            /*
             * If tag is neither referencing another triple nor being a new parent triple
             * extract content information.
             */
            let isLink = false;

            if (tag.attribs.hasOwnProperty('title'))
                name = tag.attribs.title;
            else if (tag.attribs.hasOwnProperty('content'))
                name = tag.attribs.content;
            else {
                // Extract plaintext
                name = '';
                tag.children.filter(node => node.type === 'text').forEach(text => {
                    name += text.data;
                });
            }

            // If contains "href" or "src" element set name (if name is null) and uri.
            if (tag.attribs.hasOwnProperty('href')) {
                if (!name) name = isUrl(tag.attribs.href) ? tag.attribs.href.split('/')[tag.attribs.href.split('/').length - 1] : tag.attribs.href;
                uri = tag.attribs.href;
                isLink = true;
            } else if (tag.attribs.hasOwnProperty('src')) {
                if (!name) name = isUrl(tag.attribs.src) ? tag.attribs.src.split('/')[tag.attribs.src.split('/').length - 1] : tag.attribs.src;
                uri = tag.attribs.src;
                isLink = true;
            }

            // Handling absolute and relative uri.
            if (isLink) {
                if (uri.startsWith('/')) {
                    let temp = uri;
                    uri = '';
                    siteUri.split('/').slice(0, 3).forEach(urlPart => uri += urlPart + '/');
                    uri = uri.slice(0, -1) + temp;
                } else {
                    if (!isUrl(uri)) uri = siteUri.endsWith('/') ? siteUri + uri : siteUri + '/' + uri;
                }
            } else {
                uri = isUrl(name) ? name : null;
            }
        }

        if (uri) {
            // If name is null or name is empty (or if it just contains "\r", "\n", "\t"), set name = uri (string behind last slash).
            if (!name || name.replace(/(\r|\n|\t| )/g, '').length == 0) name = uri.split('/')[uri.split('/').length - 1];
            return {name: name, uri: uri};
        } else return {name: name};
    }
}
